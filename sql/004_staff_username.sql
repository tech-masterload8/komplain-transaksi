-- Upgrade staff_users from phone/PIN to username/password and superadmin role.

ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS password_hash TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff_users' AND column_name = 'phone'
  ) THEN
    UPDATE staff_users
    SET username = phone
    WHERE (username IS NULL OR btrim(username) = '') AND phone IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff_users' AND column_name = 'pin_hash'
  ) THEN
    UPDATE staff_users
    SET password_hash = pin_hash
    WHERE (password_hash IS NULL OR btrim(password_hash) = '') AND pin_hash IS NOT NULL;
  END IF;
END $$;

UPDATE staff_users
SET username = 'user-' || replace(id::text, '-', '')
WHERE username IS NULL OR btrim(username) = '';

UPDATE staff_users
SET password_hash = '!'
WHERE password_hash IS NULL OR btrim(password_hash) = '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff_users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE staff_users ALTER COLUMN phone DROP NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff_users' AND column_name = 'pin_hash'
  ) THEN
    ALTER TABLE staff_users ALTER COLUMN pin_hash DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE staff_users ALTER COLUMN username SET NOT NULL;
ALTER TABLE staff_users ALTER COLUMN password_hash SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS staff_users_username_key ON staff_users (username);
CREATE UNIQUE INDEX IF NOT EXISTS staff_users_username_lower_key ON staff_users (lower(username));

ALTER TABLE staff_users DROP CONSTRAINT IF EXISTS staff_users_role_check;
ALTER TABLE staff_users ADD CONSTRAINT staff_users_role_check
  CHECK (role IN ('cs', 'admin', 'superadmin'));
