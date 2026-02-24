CREATE TABLE `bookmarks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`news_id` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`news_id`) REFERENCES `news`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_bookmarks_user` ON `bookmarks` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_bookmarks_news` ON `bookmarks` (`news_id`);--> statement-breakpoint
CREATE INDEX `idx_bookmarks_created` ON `bookmarks` (`created_at`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text(50) NOT NULL,
	`slug` text(50) NOT NULL,
	`icon` text(50),
	`color` text(7),
	`is_active` integer DEFAULT true
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`news_id` text,
	`title` text NOT NULL,
	`messages` text DEFAULT '[]',
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`news_id`) REFERENCES `news`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_conversations_user` ON `conversations` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_conversations_news` ON `conversations` (`news_id`);--> statement-breakpoint
CREATE INDEX `idx_conversations_updated` ON `conversations` (`updated_at`);--> statement-breakpoint
CREATE TABLE `news` (
	`id` text PRIMARY KEY NOT NULL,
	`news_api_id` text(255),
	`title` text NOT NULL,
	`url` text NOT NULL,
	`url_to_image` text,
	`content` text,
	`description` text,
	`summary_ai` text,
	`source_name` text(255),
	`source_id` text(255),
	`author` text,
	`published_at` integer NOT NULL,
	`category_id` text,
	`country` text(2),
	`language` text(2),
	`importance_score` integer DEFAULT 50,
	`keywords` text DEFAULT '[]',
	`is_breaking` integer DEFAULT false,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `news_news_api_id_unique` ON `news` (`news_api_id`);--> statement-breakpoint
CREATE INDEX `idx_news_published_at` ON `news` (`published_at`);--> statement-breakpoint
CREATE INDEX `idx_news_importance` ON `news` (`importance_score`);--> statement-breakpoint
CREATE INDEX `idx_news_category` ON `news` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_news_country` ON `news` (`country`);--> statement-breakpoint
CREATE TABLE `reading_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`news_id` text NOT NULL,
	`viewed_at` integer DEFAULT CURRENT_TIMESTAMP,
	`read_duration` integer DEFAULT 0,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`news_id`) REFERENCES `news`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_history_user` ON `reading_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_history_viewed_at` ON `reading_history` (`viewed_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text(100) NOT NULL,
	`claude_api_key_encrypted` text,
	`preferences` text DEFAULT '{"filter_keywords":[],"filter_sources":[],"filter_categories":["entertainment"],"notification_enabled":true,"daily_digest":true,"digest_time":"08:00"}',
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);