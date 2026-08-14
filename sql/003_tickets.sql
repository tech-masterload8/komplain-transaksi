-- Upgrade for existing komplain databases.

CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1;

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ticket_no TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_name TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

UPDATE conversations
SET ticket_no = 'TKT-' || lpad(nextval('ticket_seq')::text, 6, '0')
WHERE ticket_no IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_ticket_no_key'
  ) THEN
    ALTER TABLE conversations ADD CONSTRAINT conversations_ticket_no_key UNIQUE (ticket_no);
  END IF;
END $$;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_role_check;
ALTER TABLE messages ADD CONSTRAINT messages_sender_role_check
  CHECK (sender_role IN ('agent', 'cs', 'system'));
