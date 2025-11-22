-- Add new columns to form_fields first
ALTER TABLE `form_fields` ADD `allowMultiple` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `form_fields` ADD `selectionLimit` integer;--> statement-breakpoint
ALTER TABLE `form_fields` ADD `minValue` real;--> statement-breakpoint
ALTER TABLE `form_fields` ADD `maxValue` real;--> statement-breakpoint
ALTER TABLE `form_fields` ADD `defaultValue` text;--> statement-breakpoint
ALTER TABLE `form_fields` ADD `options` text;--> statement-breakpoint
ALTER TABLE `forms` ADD `allowMultipleSubmissions` integer DEFAULT true NOT NULL;--> statement-breakpoint

-- Migrate data from form_field_options to form_fields.options (JSON array)
-- This will group all options for each field into a JSON array
UPDATE form_fields 
SET options = (
  SELECT json_group_array(
    json_object('label', optionLabel, 'isDefault', CASE WHEN isDefault = 1 THEN 1 ELSE 0 END)
  )
  FROM form_field_options 
  WHERE form_field_options.formFieldId = form_fields.id
  ORDER BY form_field_options.order
)
WHERE id IN (SELECT DISTINCT formFieldId FROM form_field_options);--> statement-breakpoint

-- Now safe to drop the old table
DROP TABLE `form_field_options`;