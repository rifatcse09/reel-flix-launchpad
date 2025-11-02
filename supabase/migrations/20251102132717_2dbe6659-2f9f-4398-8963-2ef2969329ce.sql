-- Add devices column to plans table
ALTER TABLE public.plans 
ADD COLUMN devices integer NOT NULL DEFAULT 2;

-- Remove the device_options jsonb column
ALTER TABLE public.plans 
DROP COLUMN device_options;

-- Add a price column for each plan row
ALTER TABLE public.plans 
ADD COLUMN price numeric NOT NULL DEFAULT 0;