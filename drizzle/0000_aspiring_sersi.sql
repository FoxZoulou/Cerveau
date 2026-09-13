CREATE TABLE `areas` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT 'folder' NOT NULL,
	`color` text DEFAULT 'stone' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `areas_household_idx` ON `areas` (`household_id`);--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`filename` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`stored_path` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `attachments_item_idx` ON `attachments` (`item_id`);--> statement-breakpoint
CREATE TABLE `doc_fields` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`label` text NOT NULL,
	`value` text DEFAULT '' NOT NULL,
	`secret` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `doc_fields_item_idx` ON `doc_fields` (`item_id`);--> statement-breakpoint
CREATE TABLE `events` (
	`item_id` text PRIMARY KEY NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text,
	`all_day` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `events_start_idx` ON `events` (`start_at`);--> statement-breakpoint
CREATE TABLE `household_members` (
	`household_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` integer NOT NULL,
	PRIMARY KEY(`household_id`, `user_id`),
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `households` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`invite_code` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `households_invite_code_unique` ON `households` (`invite_code`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`kind` text DEFAULT 'note' NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`area_id` text,
	`project_id` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `items_household_kind_idx` ON `items` (`household_id`,`kind`);--> statement-breakpoint
CREATE INDEX `items_area_idx` ON `items` (`area_id`);--> statement-breakpoint
CREATE INDEX `items_project_idx` ON `items` (`project_id`);--> statement-breakpoint
CREATE TABLE `list_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`text` text NOT NULL,
	`checked` integer DEFAULT false NOT NULL,
	`checked_by` text,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`checked_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `list_entries_item_idx` ON `list_entries` (`item_id`);--> statement-breakpoint
CREATE TABLE `notifications_sent` (
	`task_id` text NOT NULL,
	`due_key` text NOT NULL,
	`sent_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`task_id`, `due_key`),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`item_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `procedure_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`text` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `procedure_steps_item_idx` ON `procedure_steps` (`item_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`area_id` text,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `projects_household_idx` ON `projects` (`household_id`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_idx` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `task_completions` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`completed_by` text,
	`completed_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`item_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`completed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `task_completions_task_idx` ON `task_completions` (`task_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`item_id` text PRIMARY KEY NOT NULL,
	`due_date` text,
	`due_time` text,
	`recurrence` text,
	`assignee_id` text,
	`priority` integer DEFAULT 0 NOT NULL,
	`completed_at` integer,
	`procedure_id` text,
	`remind_minutes_before` integer,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`procedure_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tasks_due_idx` ON `tasks` (`due_date`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);