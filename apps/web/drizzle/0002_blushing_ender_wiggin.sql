CREATE TABLE `outcome_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`journey_id` text NOT NULL,
	`path` text NOT NULL,
	`reached_destination` integer NOT NULL,
	`primary_outcome` text NOT NULL,
	`promise_matched` text NOT NULL,
	`cost_matched` text NOT NULL,
	`actual_cost_minor` integer,
	`currency` text,
	`notes` text,
	`consent_given` integer NOT NULL,
	`review_status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_outcome_reports_user_review` ON `outcome_reports` (`user_id`,`review_status`);--> statement-breakpoint
CREATE TABLE `partner_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`portal_type` text NOT NULL,
	`organization_name` text NOT NULL,
	`country_code` text,
	`submission_type` text NOT NULL,
	`title` text NOT NULL,
	`evidence` text NOT NULL,
	`fee_declaration` text,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_partner_submissions_user_status` ON `partner_submissions` (`user_id`,`status`);