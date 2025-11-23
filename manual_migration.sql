-- Manual migration to add missing indexes
-- Run this directly on the database

-- Add form_fields indexes if they don't exist
CREATE INDEX IF NOT EXISTS form_fields_form_id_idx ON form_fields (formId);
CREATE INDEX IF NOT EXISTS form_fields_order_idx ON form_fields (`order`);

-- Add form_response_fields index if it doesn't exist
CREATE INDEX IF NOT EXISTS form_response_fields_field_id_idx ON form_response_fields (formFieldId);
