import cron from 'node-cron';
import { and, eq, gte, isNull, lte } from 'drizzle-orm';
import { db, schema } from './db';
import { sendPush } from './push';
import { addDays, toLocalDateTime, todayKey } from '$lib/dates';

let started = false;

/** Démarre le cron in-process (une fois). Chaque minute : rappels des tâches dues. */
export function startScheduler() {
	if (started) return;
	started = true;
	cron.schedule('* * * * *', () => {
		runReminders().catch((e) => console.error('[scheduler]', e));
	});
	console.log('[scheduler] démarré');
}

/**
 * Une tâche est rappelée à `due - remindMinutesBefore` (par défaut 0 = à l'heure ;
 * sans heure : 09:00). On regarde une fenêtre [now-5min, now] pour tolérer les
 * redémarrages, et `notifications_sent` évite les doublons.
 */
export async function runReminders(now = new Date()) {
	const today = todayKey();
	const rows = await db
		.select({ task: schema.tasks, item: schema.items })
		.from(schema.tasks)
		.innerJoin(schema.items, eq(schema.items.id, schema.tasks.itemId))
		.where(
			and(
				isNull(schema.tasks.completedAt),
				isNull(schema.items.archivedAt),
				gte(schema.tasks.dueDate, addDays(today, -1)),
				lte(schema.tasks.dueDate, addDays(today, 1))
			)
		);

	for (const { task, item } of rows) {
		if (!task.dueDate) continue;
		const due = toLocalDateTime(task.dueDate, task.dueTime);
		const remindAt = new Date(due.getTime() - (task.remindMinutesBefore ?? 0) * 60_000);
		const delta = now.getTime() - remindAt.getTime();
		if (delta < 0 || delta > 5 * 60_000) continue;

		const dueKey = `${task.dueDate}T${task.dueTime ?? ''}`;
		const inserted = await db
			.insert(schema.notificationsSent)
			.values({ taskId: task.itemId, dueKey })
			.onConflictDoNothing()
			.returning({ taskId: schema.notificationsSent.taskId });
		if (inserted.length === 0) continue; // déjà envoyé

		const recipients = task.assigneeId
			? [task.assigneeId]
			: (
					await db
						.select({ userId: schema.householdMembers.userId })
						.from(schema.householdMembers)
						.where(eq(schema.householdMembers.householdId, item.householdId))
				).map((r) => r.userId);

		await sendPush(recipients, {
			title: item.title,
			body: task.dueTime ? `À faire à ${task.dueTime.replace(':', 'h')}` : "À faire aujourd'hui",
			url: `/items/${item.id}`,
			tag: `task-${item.id}`
		});
	}
}
