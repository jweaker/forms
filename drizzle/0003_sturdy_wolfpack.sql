DROP INDEX `form_fields_version_idx`;--> statement-breakpoint
DROP INDEX `form_fields_order_idx`;--> statement-breakpoint
CREATE INDEX `form_fields_order_idx` ON `form_fields` (`order`);--> statement-breakpoint
DROP INDEX `form_responses_version_idx`;--> statement-breakpoint
DROP INDEX `form_version_history_form_id_idx`;--> statement-breakpoint
DROP INDEX `form_version_history_version_idx`;--> statement-breakpoint
ALTER TABLE `forms` ADD `openTime` integer;--> statement-breakpoint
CREATE INDEX `form_response_fields_field_id_idx` ON `form_response_fields` (`formFieldId`);