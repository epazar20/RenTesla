-- Migration V4: Add password column to users table
-- Date: 2025-01-01
-- Description: Add password field for user authentication

-- Add password column to users table
ALTER TABLE users ADD COLUMN password VARCHAR(255);

-- Set default password for existing users (they can change it later)
UPDATE users SET password = 'password123' WHERE password IS NULL; 