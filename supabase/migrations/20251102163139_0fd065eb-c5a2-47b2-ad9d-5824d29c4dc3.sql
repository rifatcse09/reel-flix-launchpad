-- Add missing columns to subscriptions table
DO $$ 
BEGIN
  -- Add plan_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='subscriptions' AND column_name='plan_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN plan_id INTEGER REFERENCES plans(id);
  END IF;
  
  -- Add processor_client_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='subscriptions' AND column_name='processor_client_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN processor_client_id TEXT;
  END IF;
  
  -- Add processor_order_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='subscriptions' AND column_name='processor_order_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN processor_order_id TEXT;
  END IF;
END $$;