-- App schema. Connect to database `komplain` before running.
-- otomaxbank is never written to from this schema.

CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1;

CREATE TABLE IF NOT EXISTS staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cs' CHECK (role IN ('cs', 'admin', 'superadmin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  token TEXT PRIMARY KEY,
  agent_code TEXT NOT NULL,
  payload JSONB,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_used_at ON auth_tokens (used_at);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no TEXT UNIQUE,
  transaction_id TEXT NOT NULL UNIQUE,
  reseller_kode TEXT NOT NULL,
  reseller_phone TEXT,
  product_code TEXT,
  status TEXT NOT NULL DEFAULT 'berlangsung' CHECK (status IN ('berlangsung', 'proses', 'selesai')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('rendah', 'normal', 'tinggi')),
  assigned_to UUID REFERENCES staff_users(id),
  assigned_name TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conversations_reseller ON conversations (reseller_kode);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations (status);
CREATE INDEX IF NOT EXISTS idx_conversations_last ON conversations (last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations (assigned_to);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('agent', 'cs', 'system')),
  sender_name TEXT,
  body TEXT NOT NULL DEFAULT '',
  attachment_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS message_shortcuts (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO message_shortcuts (label, sort_order)
SELECT label, sort_order
FROM (
  VALUES
    ('serial number kosong/salah di berita', 1),
    ('sn tidak valid', 2),
    ('transaksi sukses tapi tidak ada serial number (SN)', 3),
    ('transaksi gagal', 4)
) AS s(label, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM message_shortcuts);
