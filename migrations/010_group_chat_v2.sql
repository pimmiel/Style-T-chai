ALTER TABLE group_messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'poll')),
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS poll_data jsonb;

CREATE TABLE IF NOT EXISTS group_poll_votes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid        NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL,
  option_idx integer     NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS group_poll_votes_message_idx
  ON group_poll_votes(message_id);

ALTER TABLE group_poll_votes ENABLE ROW LEVEL SECURITY;
