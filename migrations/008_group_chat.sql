CREATE TABLE IF NOT EXISTS group_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL,
  user_name  text        NOT NULL,
  content    text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_messages_group_time_idx
  ON group_messages(group_id, created_at ASC);

ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
