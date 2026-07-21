-- RLS policies for user-data tables.
-- The service-role key (used by supabaseAdmin()) bypasses RLS by design — that
-- is intentional for cron, webhooks, and admin operations.
-- These policies protect direct anon/user-JWT access at the database level.

-- ============================================================
-- posts
-- ============================================================
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Explore feed: anyone can read approved public posts
CREATE POLICY "posts_public_explore" ON posts
  FOR SELECT
  USING (moderation_status = 'approved' AND 'explore' = ANY(visibility));

-- Owners see all of their own posts
CREATE POLICY "posts_owner_select" ON posts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Owners can insert their own posts
CREATE POLICY "posts_owner_insert" ON posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Owners can update their own posts
CREATE POLICY "posts_owner_update" ON posts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Owners can delete their own posts
CREATE POLICY "posts_owner_delete" ON posts
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- groups
-- ============================================================
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read groups (membership check is in app code)
CREATE POLICY "groups_authenticated_read" ON groups
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only owner can create groups
CREATE POLICY "groups_owner_insert" ON groups
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Only owner can update/delete their group
CREATE POLICY "groups_owner_write" ON groups
  FOR ALL
  USING (auth.uid() = owner_id);

-- ============================================================
-- group_members
-- ============================================================
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Members can see other members in their groups
CREATE POLICY "group_members_member_read" ON group_members
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    group_id IN (
      SELECT group_id FROM group_members gm2
      WHERE gm2.user_id = auth.uid()
    )
  );

-- Users can insert themselves as members (joining a group)
CREATE POLICY "group_members_self_insert" ON group_members
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove themselves; group owners can remove anyone
CREATE POLICY "group_members_self_or_owner_delete" ON group_members
  FOR DELETE
  USING (
    auth.uid() = user_id OR
    group_id IN (
      SELECT id FROM groups WHERE owner_id = auth.uid()
    )
  );

-- ============================================================
-- group_outfits
-- ============================================================
ALTER TABLE group_outfits ENABLE ROW LEVEL SECURITY;

-- Group members can read approved outfits
CREATE POLICY "group_outfits_member_read" ON group_outfits
  FOR SELECT
  USING (
    moderation_status = 'approved' AND
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid()
    )
  );

-- Members can post outfits to groups they belong to
CREATE POLICY "group_outfits_member_insert" ON group_outfits
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid()
    )
  );

-- Owners can delete their own outfits
CREATE POLICY "group_outfits_owner_delete" ON group_outfits
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- group_outfit_votes
-- ============================================================
ALTER TABLE group_outfit_votes ENABLE ROW LEVEL SECURITY;

-- Members can see votes on outfits in their groups
CREATE POLICY "votes_member_read" ON group_outfit_votes
  FOR SELECT
  USING (
    group_outfit_id IN (
      SELECT go.id FROM group_outfits go
      JOIN group_members gm ON gm.group_id = go.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

-- Members can vote
CREATE POLICY "votes_member_insert" ON group_outfit_votes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own vote
CREATE POLICY "votes_owner_delete" ON group_outfit_votes
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- moderation_logs
-- ============================================================
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;
-- No direct client access — service role only (no SELECT policy for anon/user)

-- ============================================================
-- ai_usage — per-user daily AI call counter (rate limiting)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  call_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
-- No direct client access — service role only

-- Atomic increment function used by aiRateLimit.ts.
-- Returns the new call_count after incrementing.
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id TEXT, p_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO ai_usage (user_id, date, call_count)
    VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, date)
    DO UPDATE SET call_count = ai_usage.call_count + 1
  RETURNING call_count INTO v_count;
  RETURN v_count;
END;
$$;
