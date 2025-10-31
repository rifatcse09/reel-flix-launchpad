ALTER TABLE profiles
ADD COLUMN whmcs_client_id integer;

-- (optional: if you want to ensure one WHMCS client per profile)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_whmcs_client_id_idx
ON profiles (whmcs_client_id);
