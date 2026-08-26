CREATE TABLE `journey_records` (
	`id` text PRIMARY KEY NOT NULL,
	`journey_id` text NOT NULL,
	`user_id` text NOT NULL,
	`record_type` text NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`notes` text,
	`due_at` text,
	`amount_minor` integer,
	`currency` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_records_journey_status` ON `journey_records` (`journey_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_records_user_due` ON `journey_records` (`user_id`,`due_at`);