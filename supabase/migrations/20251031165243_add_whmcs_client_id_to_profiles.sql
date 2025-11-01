-- 1) Columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whmcs_client_id integer,
  ADD COLUMN IF NOT EXISTS trial_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS trial_ends_at   timestamptz NULL;

-- 2) Unique index for WHMCS client id
-- (allows multiple NULLs; only non-null values must be unique)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_whmcs_client_id_idx
  ON public.profiles (whmcs_client_id);

