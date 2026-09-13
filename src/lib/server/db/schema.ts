import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const id = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());
const now = () =>
	integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date());

export const ITEM_KINDS = ['task', 'note', 'list', 'event', 'procedure', 'doc'] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export type Recurrence = {
	freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
	interval: number;
	/** 0 = dimanche … 6 = samedi (uniquement pour weekly) */
	byWeekday?: number[];
};

// ---------- Comptes & foyer ----------

export const users = sqliteTable('users', {
	id: id(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	name: text('name').notNull(),
	createdAt: now()
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull()
});

export const households = sqliteTable('households', {
	id: id(),
	name: text('name').notNull(),
	inviteCode: text('invite_code').notNull().unique(),
	createdAt: now()
});

export const householdMembers = sqliteTable(
	'household_members',
	{
		householdId: text('household_id')
			.notNull()
			.references(() => households.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		role: text('role', { enum: ['owner', 'member'] }).notNull().default('member'),
		joinedAt: integer('joined_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [primaryKey({ columns: [t.householdId, t.userId] })]
);

// ---------- Organisation ----------

export const areas = sqliteTable(
	'areas',
	{
		id: id(),
		householdId: text('household_id')
			.notNull()
			.references(() => households.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		icon: text('icon').notNull().default('folder'),
		color: text('color').notNull().default('stone'),
		position: integer('position').notNull().default(0)
	},
	(t) => [index('areas_household_idx').on(t.householdId)]
);

export const projects = sqliteTable(
	'projects',
	{
		id: id(),
		householdId: text('household_id')
			.notNull()
			.references(() => households.id, { onDelete: 'cascade' }),
		areaId: text('area_id').references(() => areas.id, { onDelete: 'set null' }),
		name: text('name').notNull(),
		status: text('status', { enum: ['active', 'done', 'archived'] }).notNull().default('active'),
		createdAt: now()
	},
	(t) => [index('projects_household_idx').on(t.householdId)]
);

// ---------- Items (tout ce qu'on capture) ----------

export const items = sqliteTable(
	'items',
	{
		id: id(),
		householdId: text('household_id')
			.notNull()
			.references(() => households.id, { onDelete: 'cascade' }),
		kind: text('kind', { enum: ITEM_KINDS }).notNull().default('note'),
		title: text('title').notNull(),
		body: text('body').notNull().default(''),
		areaId: text('area_id').references(() => areas.id, { onDelete: 'set null' }),
		projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
		createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
		createdAt: now(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date()),
		archivedAt: integer('archived_at', { mode: 'timestamp_ms' })
	},
	(t) => [
		index('items_household_kind_idx').on(t.householdId, t.kind),
		index('items_area_idx').on(t.areaId),
		index('items_project_idx').on(t.projectId)
	]
);

export const tasks = sqliteTable(
	'tasks',
	{
		itemId: text('item_id')
			.primaryKey()
			.references(() => items.id, { onDelete: 'cascade' }),
		/** YYYY-MM-DD (date locale du foyer) */
		dueDate: text('due_date'),
		/** HH:MM */
		dueTime: text('due_time'),
		recurrence: text('recurrence', { mode: 'json' }).$type<Recurrence | null>(),
		assigneeId: text('assignee_id').references(() => users.id, { onDelete: 'set null' }),
		priority: integer('priority').notNull().default(0),
		completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
		procedureId: text('procedure_id').references(() => items.id, { onDelete: 'set null' }),
		remindMinutesBefore: integer('remind_minutes_before')
	},
	(t) => [index('tasks_due_idx').on(t.dueDate)]
);

export const taskCompletions = sqliteTable(
	'task_completions',
	{
		id: id(),
		taskId: text('task_id')
			.notNull()
			.references(() => tasks.itemId, { onDelete: 'cascade' }),
		completedBy: text('completed_by').references(() => users.id, { onDelete: 'set null' }),
		completedAt: integer('completed_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [index('task_completions_task_idx').on(t.taskId)]
);

export const listEntries = sqliteTable(
	'list_entries',
	{
		id: id(),
		itemId: text('item_id')
			.notNull()
			.references(() => items.id, { onDelete: 'cascade' }),
		text: text('text').notNull(),
		checked: integer('checked', { mode: 'boolean' }).notNull().default(false),
		checkedBy: text('checked_by').references(() => users.id, { onDelete: 'set null' }),
		position: integer('position').notNull().default(0)
	},
	(t) => [index('list_entries_item_idx').on(t.itemId)]
);

export const procedureSteps = sqliteTable(
	'procedure_steps',
	{
		id: id(),
		itemId: text('item_id')
			.notNull()
			.references(() => items.id, { onDelete: 'cascade' }),
		position: integer('position').notNull().default(0),
		text: text('text').notNull()
	},
	(t) => [index('procedure_steps_item_idx').on(t.itemId)]
);

export const events = sqliteTable(
	'events',
	{
		itemId: text('item_id')
			.primaryKey()
			.references(() => items.id, { onDelete: 'cascade' }),
		/** ISO local sans fuseau : YYYY-MM-DDTHH:MM ou YYYY-MM-DD si allDay */
		startAt: text('start_at').notNull(),
		endAt: text('end_at'),
		allDay: integer('all_day', { mode: 'boolean' }).notNull().default(false)
	},
	(t) => [index('events_start_idx').on(t.startAt)]
);

export const docFields = sqliteTable(
	'doc_fields',
	{
		id: id(),
		itemId: text('item_id')
			.notNull()
			.references(() => items.id, { onDelete: 'cascade' }),
		label: text('label').notNull(),
		value: text('value').notNull().default(''),
		secret: integer('secret', { mode: 'boolean' }).notNull().default(false),
		position: integer('position').notNull().default(0)
	},
	(t) => [index('doc_fields_item_idx').on(t.itemId)]
);

export const attachments = sqliteTable(
	'attachments',
	{
		id: id(),
		itemId: text('item_id')
			.notNull()
			.references(() => items.id, { onDelete: 'cascade' }),
		filename: text('filename').notNull(),
		mime: text('mime').notNull(),
		size: integer('size').notNull(),
		storedPath: text('stored_path').notNull(),
		createdAt: now()
	},
	(t) => [index('attachments_item_idx').on(t.itemId)]
);

// ---------- Notifications ----------

export const pushSubscriptions = sqliteTable(
	'push_subscriptions',
	{
		id: id(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		endpoint: text('endpoint').notNull(),
		p256dh: text('p256dh').notNull(),
		auth: text('auth').notNull(),
		createdAt: now()
	},
	(t) => [uniqueIndex('push_subscriptions_endpoint_idx').on(t.endpoint)]
);

export const notificationsSent = sqliteTable(
	'notifications_sent',
	{
		taskId: text('task_id')
			.notNull()
			.references(() => tasks.itemId, { onDelete: 'cascade' }),
		dueKey: text('due_key').notNull(),
		sentAt: integer('sent_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch() * 1000)`)
	},
	(t) => [primaryKey({ columns: [t.taskId, t.dueKey] })]
);

export type User = typeof users.$inferSelect;
export type Household = typeof households.$inferSelect;
export type Area = typeof areas.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type ListEntry = typeof listEntries.$inferSelect;
export type ProcedureStep = typeof procedureSteps.$inferSelect;
export type Event = typeof events.$inferSelect;
export type DocField = typeof docFields.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
