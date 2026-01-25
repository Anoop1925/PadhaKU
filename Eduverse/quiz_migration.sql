-- Migration for Quiz Feature
-- Run this in Supabase SQL Editor

-- Add unique constraint for upsert operation on user_progress
-- This allows us to upsert based on user_email, course_id, and chapter_index
ALTER TABLE user_progress
ADD CONSTRAINT user_progress_unique_chapter 
UNIQUE (user_email, course_id, chapter_index);

-- Create index for faster progress lookups
CREATE INDEX IF NOT EXISTS idx_user_progress_lookup 
ON user_progress(user_email, course_id);

-- Create index for points history
CREATE INDEX IF NOT EXISTS idx_points_history_user 
ON points_history(user_email);

-- Create index for user points
CREATE INDEX IF NOT EXISTS idx_user_points_email 
ON user_points(user_email);

-- Note: If the constraint already exists, you may get an error.
-- In that case, you can skip the ALTER TABLE command.
