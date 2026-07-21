CREATE TABLE IF NOT EXISTS group_message_reads (
  group_id     uuid        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS group_message_reads_group_idx
  ON group_message_reads(group_id);

ALTER TABLE group_message_reads ENABLE ROW LEVEL SECURITY;
