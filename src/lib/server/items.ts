import { and, asc, desc, eq, gte, isNotNull, isNull, like, lte, or, sql } from 'drizzle-orm';
import { db, schema } from './db';
import type { ItemKind, Recurrence } from './db/schema';
import { notifyChanged } from './events';
import { nextOccurrence } from './recurrence';
import { addDays, todayKey } from '$lib/dates';

const { items, tasks, taskCompletions, listEntries, procedureSteps, events, docFields, attachments, areas, projects, users } =
	schema;

export type NewItem = {
	householdId: string;
	kind: ItemKind;
	title: string;
	body?: string;
	areaId?: string | null;
	projectId?: string | null;
	createdBy: string;
	task?: Partial<typeof tasks.$inferInsert>;
	event?: Partial<typeof events.$inferInsert>;
};

/** Crée un item et sa table de détail selon le type. Retourne l'id. */
export async function createItem(input: NewItem): Promise<string> {
	const [row] = await db
		.insert(items)
		.values({
			householdId: input.householdId,
			kind: input.kind,
			title: input.title.trim(),
			body: input.body ?? '',
			areaId: input.areaId || null,
			projectId: input.projectId || null,
			createdBy: input.createdBy
		})
		.returning({ id: items.id });
	await ensureDetail(row.id, input.kind, input);
	notifyChanged(input.householdId, input.createdBy);
	return row.id;
}

/** Garantit l'existence de la ligne de détail pour le type. */
async function ensureDetail(itemId: string, kind: ItemKind, input?: Pick<NewItem, 'task' | 'event'>) {
	if (kind === 'task') {
		await db
			.insert(tasks)
			.values({ itemId, ...input?.task })
			.onConflictDoNothing();
	} else if (kind === 'event') {
		await db
			.insert(events)
			.values({ itemId, startAt: input?.event?.startAt ?? todayKey(), allDay: input?.event?.allDay ?? true, endAt: input?.event?.endAt ?? null })
			.onConflictDoNothing();
	}
}

/** Charge un item avec tout ce qui va avec, en vérifiant l'appartenance au foyer. */
export async function getItem(id: string, householdId: string) {
	const item = await db.query.items.findFirst({ where: and(eq(items.id, id), eq(items.householdId, householdId)) });
	if (!item) return null;
	const [task, event, entries, steps, fields, files, area, project] = await Promise.all([
		db.query.tasks.findFirst({ where: eq(tasks.itemId, id) }),
		db.query.events.findFirst({ where: eq(events.itemId, id) }),
		db.select().from(listEntries).where(eq(listEntries.itemId, id)).orderBy(asc(listEntries.position), asc(listEntries.id)),
		db.select().from(procedureSteps).where(eq(procedureSteps.itemId, id)).orderBy(asc(procedureSteps.position)),
		db.select().from(docFields).where(eq(docFields.itemId, id)).orderBy(asc(docFields.position)),
		db.select().from(attachments).where(eq(attachments.itemId, id)).orderBy(asc(attachments.createdAt)),
		item.areaId ? db.query.areas.findFirst({ where: eq(areas.id, item.areaId) }) : null,
		item.projectId ? db.query.projects.findFirst({ where: eq(projects.id, item.projectId) }) : null
	]);
	const procedure = task?.procedureId
		? await db.query.items.findFirst({ where: eq(items.id, task.procedureId), columns: { id: true, title: true } })
		: null;
	const completions = task
		? await db
				.select({ id: taskCompletions.id, completedAt: taskCompletions.completedAt, by: users.name })
				.from(taskCompletions)
				.leftJoin(users, eq(users.id, taskCompletions.completedBy))
				.where(eq(taskCompletions.taskId, id))
				.orderBy(desc(taskCompletions.completedAt))
				.limit(10)
		: [];
	// Tâches qui pointent vers cette procédure
	const linkedTasks =
		item.kind === 'procedure'
			? await db
					.select({ id: items.id, title: items.title, dueDate: tasks.dueDate })
					.from(tasks)
					.innerJoin(items, eq(items.id, tasks.itemId))
					.where(and(eq(tasks.procedureId, id), isNull(items.archivedAt)))
			: [];
	return { ...item, task: task ?? null, event: event ?? null, entries, steps, fields, files, area: area ?? null, project: project ?? null, procedure, completions, linkedTasks };
}

export type FullItem = NonNullable<Awaited<ReturnType<typeof getItem>>>;

export async function updateItem(
	id: string,
	householdId: string,
	by: string,
	patch: Partial<Pick<typeof items.$inferInsert, 'title' | 'body' | 'areaId' | 'projectId' | 'archivedAt'>>
) {
	await db
		.update(items)
		.set({ ...patch, updatedAt: new Date() })
		.where(and(eq(items.id, id), eq(items.householdId, householdId)));
	notifyChanged(householdId, by);
}

export async function updateTask(id: string, householdId: string, by: string, patch: Partial<typeof tasks.$inferInsert>) {
	await ensureDetail(id, 'task');
	await db.update(tasks).set(patch).where(eq(tasks.itemId, id));
	await db.update(items).set({ updatedAt: new Date() }).where(and(eq(items.id, id), eq(items.householdId, householdId)));
	notifyChanged(householdId, by);
}

export async function updateEvent(id: string, householdId: string, by: string, patch: Partial<typeof events.$inferInsert>) {
	await ensureDetail(id, 'event');
	await db.update(events).set(patch).where(eq(events.itemId, id));
	await db.update(items).set({ updatedAt: new Date() }).where(and(eq(items.id, id), eq(items.householdId, householdId)));
	notifyChanged(householdId, by);
}

/** Change le type d'un item (ex. note → tâche) sans rien perdre. */
export async function convertKind(id: string, householdId: string, by: string, kind: ItemKind) {
	await db.update(items).set({ kind, updatedAt: new Date() }).where(and(eq(items.id, id), eq(items.householdId, householdId)));
	await ensureDetail(id, kind);
	// Une note dont le corps contient des lignes devient une liste / procédure avec ces lignes.
	if (kind === 'list' || kind === 'procedure') {
		const item = await db.query.items.findFirst({ where: eq(items.id, id) });
		const table = kind === 'list' ? listEntries : procedureSteps;
		const existing = await db.select({ id: table.id }).from(table).where(eq(table.itemId, id)).limit(1);
		if (item && existing.length === 0 && item.body.trim()) {
			const lines = item.body.split('\n').map((l) => l.replace(/^[-*•\d.)\s]+/, '').trim()).filter(Boolean);
			if (lines.length) {
				await db.insert(table).values(lines.map((text, position) => ({ itemId: id, text, position })));
				await db.update(items).set({ body: '' }).where(eq(items.id, id));
			}
		}
	}
	notifyChanged(householdId, by);
}

export async function deleteItem(id: string, householdId: string, by: string) {
	await db.delete(items).where(and(eq(items.id, id), eq(items.householdId, householdId)));
	notifyChanged(householdId, by);
}

// ---------- Tâches ----------

/** Coche une tâche : historise, et re-planifie si récurrente. */
export async function completeTask(id: string, householdId: string, by: string) {
	const row = await db
		.select({ task: tasks, item: items })
		.from(tasks)
		.innerJoin(items, eq(items.id, tasks.itemId))
		.where(and(eq(tasks.itemId, id), eq(items.householdId, householdId)))
		.get();
	if (!row) return;
	await db.insert(taskCompletions).values({ taskId: id, completedBy: by });
	const rec = row.task.recurrence as Recurrence | null;
	if (rec && row.task.dueDate) {
		await db.update(tasks).set({ dueDate: nextOccurrence(row.task.dueDate, rec), completedAt: null }).where(eq(tasks.itemId, id));
	} else {
		await db.update(tasks).set({ completedAt: new Date() }).where(eq(tasks.itemId, id));
	}
	await db.update(items).set({ updatedAt: new Date() }).where(eq(items.id, id));
	notifyChanged(householdId, by);
}

export async function uncompleteTask(id: string, householdId: string, by: string) {
	await db.update(tasks).set({ completedAt: null }).where(eq(tasks.itemId, id));
	const last = await db
		.select({ id: taskCompletions.id })
		.from(taskCompletions)
		.where(eq(taskCompletions.taskId, id))
		.orderBy(desc(taskCompletions.completedAt))
		.limit(1)
		.get();
	if (last) await db.delete(taskCompletions).where(eq(taskCompletions.id, last.id));
	notifyChanged(householdId, by);
}

export type TaskRow = {
	id: string;
	title: string;
	kind: ItemKind;
	areaId: string | null;
	areaName: string | null;
	areaColor: string | null;
	projectName: string | null;
	dueDate: string | null;
	dueTime: string | null;
	priority: number;
	recurrence: Recurrence | null;
	assigneeId: string | null;
	assigneeName: string | null;
	completedAt: Date | null;
	procedureId: string | null;
};

const taskSelect = {
	id: items.id,
	title: items.title,
	kind: items.kind,
	areaId: items.areaId,
	areaName: areas.name,
	areaColor: areas.color,
	projectName: projects.name,
	dueDate: tasks.dueDate,
	dueTime: tasks.dueTime,
	priority: tasks.priority,
	recurrence: tasks.recurrence,
	assigneeId: tasks.assigneeId,
	assigneeName: users.name,
	completedAt: tasks.completedAt,
	procedureId: tasks.procedureId
};

function taskQuery() {
	return db
		.select(taskSelect)
		.from(tasks)
		.innerJoin(items, eq(items.id, tasks.itemId))
		.leftJoin(areas, eq(areas.id, items.areaId))
		.leftJoin(projects, eq(projects.id, items.projectId))
		.leftJoin(users, eq(users.id, tasks.assigneeId));
}

/** Tâches ouvertes : en retard, aujourd'hui, 7 prochains jours, sans date. */
export async function openTasks(householdId: string, opts: { assigneeId?: string; horizonDays?: number } = {}) {
	const today = todayKey();
	const horizon = addDays(today, opts.horizonDays ?? 7);
	const conds = [eq(items.householdId, householdId), isNull(items.archivedAt), isNull(tasks.completedAt)];
	if (opts.assigneeId) conds.push(or(eq(tasks.assigneeId, opts.assigneeId), isNull(tasks.assigneeId))!);
	const rows = (await taskQuery()
		.where(and(...conds))
		.orderBy(asc(tasks.dueDate), asc(tasks.dueTime), desc(tasks.priority), asc(items.createdAt))) as TaskRow[];
	return {
		overdue: rows.filter((t) => t.dueDate && t.dueDate < today),
		today: rows.filter((t) => t.dueDate === today),
		week: rows.filter((t) => t.dueDate && t.dueDate > today && t.dueDate <= horizon),
		later: rows.filter((t) => t.dueDate && t.dueDate > horizon),
		undated: rows.filter((t) => !t.dueDate)
	};
}

export async function recentlyCompleted(householdId: string, limit = 20) {
	return (await taskQuery()
		.where(and(eq(items.householdId, householdId), isNotNull(tasks.completedAt)))
		.orderBy(desc(tasks.completedAt))
		.limit(limit)) as TaskRow[];
}

// ---------- Inbox & navigation ----------

export type ItemRow = {
	id: string;
	kind: ItemKind;
	title: string;
	body: string;
	createdAt: Date;
	updatedAt: Date;
	areaName: string | null;
	areaColor: string | null;
	projectName: string | null;
	dueDate: string | null;
	completedAt: Date | null;
	startAt: string | null;
};

function itemQuery() {
	return db
		.select({
			id: items.id,
			kind: items.kind,
			title: items.title,
			body: items.body,
			createdAt: items.createdAt,
			updatedAt: items.updatedAt,
			areaName: areas.name,
			areaColor: areas.color,
			projectName: projects.name,
			dueDate: tasks.dueDate,
			completedAt: tasks.completedAt,
			startAt: events.startAt
		})
		.from(items)
		.leftJoin(areas, eq(areas.id, items.areaId))
		.leftJoin(projects, eq(projects.id, items.projectId))
		.leftJoin(tasks, eq(tasks.itemId, items.id))
		.leftJoin(events, eq(events.itemId, items.id));
}

/** Inbox : tout ce qui n'est ni classé ni archivé (hors listes, qui ont leur onglet). */
export async function inboxItems(householdId: string) {
	return (await itemQuery()
		.where(and(eq(items.householdId, householdId), isNull(items.archivedAt), isNull(items.areaId), isNull(items.projectId), sql`${items.kind} != 'list'`))
		.orderBy(desc(items.createdAt))) as ItemRow[];
}

export async function itemsByKind(householdId: string, kind: ItemKind, opts: { includeArchived?: boolean } = {}) {
	const conds = [eq(items.householdId, householdId), eq(items.kind, kind)];
	if (!opts.includeArchived) conds.push(isNull(items.archivedAt));
	return (await itemQuery()
		.where(and(...conds))
		.orderBy(desc(items.updatedAt))) as ItemRow[];
}

export async function archivedItems(householdId: string) {
	return (await itemQuery()
		.where(and(eq(items.householdId, householdId), isNotNull(items.archivedAt)))
		.orderBy(desc(items.archivedAt))
		.limit(200)) as ItemRow[];
}

export async function itemsByArea(householdId: string, areaId: string) {
	return (await itemQuery()
		.where(and(eq(items.householdId, householdId), eq(items.areaId, areaId), isNull(items.archivedAt)))
		.orderBy(asc(items.kind), desc(items.updatedAt))) as ItemRow[];
}

export async function itemsByProject(householdId: string, projectId: string) {
	return (await itemQuery()
		.where(and(eq(items.householdId, householdId), eq(items.projectId, projectId), isNull(items.archivedAt)))
		.orderBy(asc(items.kind), desc(items.updatedAt))) as ItemRow[];
}

export async function searchItems(householdId: string, q: string) {
	const pattern = `%${q.trim().replace(/[%_]/g, '')}%`;
	return (await itemQuery()
		.where(and(eq(items.householdId, householdId), or(like(items.title, pattern), like(items.body, pattern))))
		.orderBy(desc(items.updatedAt))
		.limit(50)) as ItemRow[];
}

/** Listes avec compteur d'articles restants. */
export async function listsOverview(householdId: string) {
	return db
		.select({
			id: items.id,
			title: items.title,
			updatedAt: items.updatedAt,
			total: sql<number>`count(${listEntries.id})`,
			remaining: sql<number>`coalesce(sum(case when ${listEntries.checked} = 0 then 1 else 0 end), 0)`
		})
		.from(items)
		.leftJoin(listEntries, eq(listEntries.itemId, items.id))
		.where(and(eq(items.householdId, householdId), eq(items.kind, 'list'), isNull(items.archivedAt)))
		.groupBy(items.id)
		.orderBy(desc(items.updatedAt));
}

// ---------- Agenda ----------

export async function agendaRange(householdId: string, from: string, to: string) {
	const [taskRows, eventRows] = await Promise.all([
		taskQuery().where(
			and(eq(items.householdId, householdId), isNull(items.archivedAt), isNull(tasks.completedAt), gte(tasks.dueDate, from), lte(tasks.dueDate, to))
		) as Promise<TaskRow[]>,
		db
			.select({ id: items.id, title: items.title, startAt: events.startAt, endAt: events.endAt, allDay: events.allDay, areaColor: areas.color })
			.from(events)
			.innerJoin(items, eq(items.id, events.itemId))
			.leftJoin(areas, eq(areas.id, items.areaId))
			.where(and(eq(items.householdId, householdId), isNull(items.archivedAt), gte(events.startAt, from), lte(events.startAt, to + 'T23:59')))
			.orderBy(asc(events.startAt))
	]);
	return { tasks: taskRows, events: eventRows };
}

// ---------- Listes ----------

export async function addListEntry(itemId: string, householdId: string, by: string, text: string) {
	const owner = await db.query.items.findFirst({ where: and(eq(items.id, itemId), eq(items.householdId, householdId)), columns: { id: true } });
	if (!owner) return;
	const max = await db.select({ m: sql<number>`coalesce(max(${listEntries.position}), 0)` }).from(listEntries).where(eq(listEntries.itemId, itemId)).get();
	await db.insert(listEntries).values({ itemId, text: text.trim(), position: (max?.m ?? 0) + 1 });
	await db.update(items).set({ updatedAt: new Date() }).where(eq(items.id, itemId));
	notifyChanged(householdId, by);
}

export async function toggleListEntry(entryId: string, householdId: string, by: string, checked: boolean) {
	const entry = await db
		.select({ id: listEntries.id, itemId: items.id })
		.from(listEntries)
		.innerJoin(items, eq(items.id, listEntries.itemId))
		.where(and(eq(listEntries.id, entryId), eq(items.householdId, householdId)))
		.get();
	if (!entry) return;
	await db.update(listEntries).set({ checked, checkedBy: checked ? by : null }).where(eq(listEntries.id, entryId));
	await db.update(items).set({ updatedAt: new Date() }).where(eq(items.id, entry.itemId));
	notifyChanged(householdId, by);
}

export async function deleteListEntry(entryId: string, householdId: string, by: string) {
	const entry = await db
		.select({ id: listEntries.id })
		.from(listEntries)
		.innerJoin(items, eq(items.id, listEntries.itemId))
		.where(and(eq(listEntries.id, entryId), eq(items.householdId, householdId)))
		.get();
	if (!entry) return;
	await db.delete(listEntries).where(eq(listEntries.id, entryId));
	notifyChanged(householdId, by);
}

export async function uncheckAll(itemId: string, householdId: string, by: string) {
	const owner = await db.query.items.findFirst({ where: and(eq(items.id, itemId), eq(items.householdId, householdId)), columns: { id: true } });
	if (!owner) return;
	await db.update(listEntries).set({ checked: false, checkedBy: null }).where(eq(listEntries.itemId, itemId));
	notifyChanged(householdId, by);
}

export async function clearChecked(itemId: string, householdId: string, by: string) {
	const owner = await db.query.items.findFirst({ where: and(eq(items.id, itemId), eq(items.householdId, householdId)), columns: { id: true } });
	if (!owner) return;
	await db.delete(listEntries).where(and(eq(listEntries.itemId, itemId), eq(listEntries.checked, true)));
	notifyChanged(householdId, by);
}

// ---------- Procédures & documents ----------

/** Remplace l'ensemble des étapes (une par ligne). */
export async function setSteps(itemId: string, householdId: string, by: string, lines: string[]) {
	const owner = await db.query.items.findFirst({ where: and(eq(items.id, itemId), eq(items.householdId, householdId)), columns: { id: true } });
	if (!owner) return;
	await db.delete(procedureSteps).where(eq(procedureSteps.itemId, itemId));
	const clean = lines.map((l) => l.trim()).filter(Boolean);
	if (clean.length) await db.insert(procedureSteps).values(clean.map((text, position) => ({ itemId, text, position })));
	await db.update(items).set({ updatedAt: new Date() }).where(eq(items.id, itemId));
	notifyChanged(householdId, by);
}

export async function setDocFields(itemId: string, householdId: string, by: string, fields: { label: string; value: string; secret: boolean }[]) {
	const owner = await db.query.items.findFirst({ where: and(eq(items.id, itemId), eq(items.householdId, householdId)), columns: { id: true } });
	if (!owner) return;
	await db.delete(docFields).where(eq(docFields.itemId, itemId));
	const clean = fields.filter((f) => f.label.trim());
	if (clean.length) await db.insert(docFields).values(clean.map((f, position) => ({ itemId, label: f.label.trim(), value: f.value.trim(), secret: f.secret, position })));
	await db.update(items).set({ updatedAt: new Date() }).where(eq(items.id, itemId));
	notifyChanged(householdId, by);
}

// ---------- Foyer : membres, domaines, projets ----------

export async function householdMembers(householdId: string) {
	return db
		.select({ id: users.id, name: users.name, email: users.email, role: schema.householdMembers.role })
		.from(schema.householdMembers)
		.innerJoin(users, eq(users.id, schema.householdMembers.userId))
		.where(eq(schema.householdMembers.householdId, householdId))
		.orderBy(asc(schema.householdMembers.joinedAt));
}

export async function householdAreas(householdId: string) {
	return db.select().from(areas).where(eq(areas.householdId, householdId)).orderBy(asc(areas.position), asc(areas.name));
}

export async function householdProjects(householdId: string, status: 'active' | 'all' = 'active') {
	const conds = [eq(projects.householdId, householdId)];
	if (status === 'active') conds.push(eq(projects.status, 'active'));
	return db.select().from(projects).where(and(...conds)).orderBy(asc(projects.name));
}

export async function proceduresOf(householdId: string) {
	return db
		.select({ id: items.id, title: items.title })
		.from(items)
		.where(and(eq(items.householdId, householdId), eq(items.kind, 'procedure'), isNull(items.archivedAt)))
		.orderBy(asc(items.title));
}

/** Tâches ouvertes dont l'échéance est passée (vue agenda « Jours »). */
export async function overdueTasks(householdId: string) {
	const today = todayKey();
	return (await taskQuery()
		.where(and(eq(items.householdId, householdId), isNull(items.archivedAt), isNull(tasks.completedAt), sql`${tasks.dueDate} < ${today}`))
		.orderBy(asc(tasks.dueDate), desc(tasks.priority))) as TaskRow[];
}
