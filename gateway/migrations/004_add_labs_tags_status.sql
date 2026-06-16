-- 004_add_labs_tags_status.sql
-- Add tags and status columns to the labs table

ALTER TABLE labs
  ADD COLUMN IF NOT EXISTS tags    TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status  TEXT    NOT NULL DEFAULT 'available';
