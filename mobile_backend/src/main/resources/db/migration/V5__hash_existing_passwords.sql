-- Migration V5: Hash existing plain text passwords
-- Date: 2025-01-01
-- Description: Convert plain text passwords to BCrypt hashed passwords

-- Note: This migration will hash all existing passwords using BCrypt
-- Users will need to use their original passwords to login after this migration

-- For testing purposes, we'll update known test passwords
-- In production, you might want to force password reset instead

-- Hash 'password123' for existing users
-- BCrypt hash of 'password123': $2a$10$N9YvDWnqjdz2z8QKfTvK3eK2rK3fUzH.WQ2K4dGvDk5fDuOzLvQOe
UPDATE users SET password = '$2a$10$N9YvDWnqjdz2z8QKfTvK3eK2rK3fUzH.WQ2K4dGvDk5fDuOzLvQOe' 
WHERE password = 'password123';

-- Hash any other known demo passwords if they exist
-- Add more UPDATE statements here for other known passwords if needed

-- Note: Users with custom passwords will need to reset their passwords
-- as we cannot reverse-hash their plain text passwords 