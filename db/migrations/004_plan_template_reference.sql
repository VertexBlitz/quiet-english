ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS template_id TEXT REFERENCES plan_templates(id) ON DELETE SET NULL;
