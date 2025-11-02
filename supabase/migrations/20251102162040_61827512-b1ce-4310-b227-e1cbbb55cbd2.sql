-- Add currency column to plans table
ALTER TABLE plans ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';