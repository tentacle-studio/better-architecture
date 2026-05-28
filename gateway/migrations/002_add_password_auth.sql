-- 002_add_password_auth.sql
-- Add password authentication support

ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
