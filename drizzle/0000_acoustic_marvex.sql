CREATE TABLE `account` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`userId` text(255) NOT NULL,
	`accountId` text(255) NOT NULL,
	`providerId` text(255) NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text(255),
	`idToken` text,
	`password` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`userId`);--> statement-breakpoint
CREATE TABLE `form_field_options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`formFieldId` integer NOT NULL,
	`optionLabel` text(256) NOT NULL,
	`optionValue` text(256) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`formFieldId`) REFERENCES `form_fields`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `form_field_options_field_id_idx` ON `form_field_options` (`formFieldId`);--> statement-breakpoint
CREATE TABLE `form_fields` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`formId` integer NOT NULL,
	`label` text(256) NOT NULL,
	`type` text(100) NOT NULL,
	`placeholder` text(256),
	`helpText` text,
	`required` integer DEFAULT false NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`regexPattern` text,
	`validationMessage` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`formId`) REFERENCES `forms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `form_fields_form_id_idx` ON `form_fields` (`formId`);--> statement-breakpoint
CREATE INDEX `form_fields_order_idx` ON `form_fields` (`formId`,`order`);--> statement-breakpoint
CREATE TABLE `form_response_fields` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`formResponseId` integer NOT NULL,
	`formFieldId` integer NOT NULL,
	`value` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`formResponseId`) REFERENCES `form_responses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`formFieldId`) REFERENCES `form_fields`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `form_response_fields_response_id_idx` ON `form_response_fields` (`formResponseId`);--> statement-breakpoint
CREATE TABLE `form_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`formId` integer NOT NULL,
	`createdById` text(255),
	`submitterEmail` text(255),
	`isAnonymous` integer DEFAULT false NOT NULL,
	`ipAddress` text(255),
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	`rating` integer,
	`comments` text,
	FOREIGN KEY (`formId`) REFERENCES `forms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `form_responses_created_by_idx` ON `form_responses` (`createdById`);--> statement-breakpoint
CREATE INDEX `form_responses_form_id_idx` ON `form_responses` (`formId`);--> statement-breakpoint
CREATE INDEX `form_responses_submitter_email_idx` ON `form_responses` (`submitterEmail`);--> statement-breakpoint
CREATE TABLE `forms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(256) NOT NULL,
	`slug` text(256) NOT NULL,
	`description` text,
	`status` text(50) DEFAULT 'draft' NOT NULL,
	`isPublic` integer DEFAULT false NOT NULL,
	`allowAnonymous` integer DEFAULT true NOT NULL,
	`createdById` text(255) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `forms_slug_unique` ON `forms` (`slug`);--> statement-breakpoint
CREATE INDEX `forms_created_by_idx` ON `forms` (`createdById`);--> statement-breakpoint
CREATE INDEX `forms_name_idx` ON `forms` (`name`);--> statement-breakpoint
CREATE INDEX `forms_slug_idx` ON `forms` (`slug`);--> statement-breakpoint
CREATE INDEX `forms_status_idx` ON `forms` (`status`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`userId` text(255) NOT NULL,
	`token` text(255) NOT NULL,
	`expiresAt` integer NOT NULL,
	`ipAddress` text(255),
	`userAgent` text(255),
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`userId`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`name` text(255),
	`email` text(255) NOT NULL,
	`emailVerified` integer DEFAULT false,
	`image` text(255),
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`identifier` text(255) NOT NULL,
	`value` text(255) NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);