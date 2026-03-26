-- 004_step_status_and_scheduling.sql
-- Sprint 6: Add step status and scheduling columns to experience_steps.

ALTER TABLE experience_steps ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE experience_steps ADD COLUMN IF NOT EXISTS scheduled_date date;
ALTER TABLE experience_steps ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE experience_steps ADD COLUMN IF NOT EXISTS estimated_minutes integer;
ALTER TABLE experience_steps ADD COLUMN IF NOT EXISTS completed_at timestamptz;
