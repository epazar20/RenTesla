-- Add identity_number column to users table
-- First add as nullable, then update existing records, then make NOT NULL

-- Step 1: Add column as nullable
ALTER TABLE users ADD COLUMN identity_number VARCHAR(20);

-- Step 2: Update existing records with placeholder values
UPDATE users SET identity_number = 'TEMP_' || id::text WHERE identity_number IS NULL;

-- Step 3: Make column NOT NULL
ALTER TABLE users ALTER COLUMN identity_number SET NOT NULL;

-- Step 4: Create unique index for identity_number
CREATE UNIQUE INDEX idx_users_identity_number ON users(identity_number); 