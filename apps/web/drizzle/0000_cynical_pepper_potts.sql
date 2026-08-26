CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`journey_id` text,
	`alert_type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`severity` text NOT NULL,
	`read_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_alerts_user_read` ON `alerts` (`user_id`,`read_at`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`details_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_user_created` ON `audit_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `delegations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`journey_id` text,
	`delegate_contact` text NOT NULL,
	`relationship` text NOT NULL,
	`permissions_json` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_delegations_user_status` ON `delegations` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`journey_id` text,
	`category` text NOT NULL,
	`label` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`object_key` text NOT NULL,
	`verification_status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_documents_user_created` ON `documents` (`user_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_documents_object_key` ON `documents` (`object_key`);--> statement-breakpoint
CREATE TABLE `journey_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`journey_id` text NOT NULL,
	`user_id` text NOT NULL,
	`task_key` text NOT NULL,
	`title_bn` text NOT NULL,
	`title_en` text NOT NULL,
	`detail_bn` text NOT NULL,
	`detail_en` text NOT NULL,
	`status` text NOT NULL,
	`position` integer NOT NULL,
	`due_at` text,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tasks_journey_key` ON `journey_tasks` (`journey_id`,`task_key`);--> statement-breakpoint
CREATE INDEX `idx_tasks_user_status` ON `journey_tasks` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `journeys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`path` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text,
	`title` text NOT NULL,
	`destination_country` text,
	`stage` text NOT NULL,
	`status` text NOT NULL,
	`details_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_journeys_user_status` ON `journeys` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_journeys_user_path` ON `journeys` (`user_id`,`path`);--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`journey_id` text,
	`entry_type` text NOT NULL,
	`label` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`payee` text,
	`status` text NOT NULL,
	`legal_basis` text,
	`receipt_document_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ledger_user_created` ON `ledger_entries` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `saved_opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`path` text NOT NULL,
	`opportunity_type` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`title` text NOT NULL,
	`details_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_saved_user_opportunity` ON `saved_opportunities` (`user_id`,`opportunity_type`,`opportunity_id`);--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`journey_id` text,
	`priority` text NOT NULL,
	`category` text NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_support_user_status` ON `support_tickets` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`locale` text NOT NULL,
	`active_path` text NOT NULL,
	`enabled_paths` text DEFAULT '["work","study"]' NOT NULL,
	`journey_stage` text DEFAULT 'exploring' NOT NULL,
	`goal_title` text,
	`onboarding_completed_at` text,
	`passport_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `verification_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`subject` text NOT NULL,
	`evidence` text,
	`status` text NOT NULL,
	`result_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_verification_user_status` ON `verification_requests` (`user_id`,`status`);
