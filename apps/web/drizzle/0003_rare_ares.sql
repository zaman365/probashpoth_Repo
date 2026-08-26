ALTER TABLE `user_profiles` ADD `journey_stage` text DEFAULT 'exploring' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `goal_title` text;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `onboarding_completed_at` text;