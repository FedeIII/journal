-- Add columns to track user progress and personalized goals
ALTER TABLE users ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS completion_samples JSONB DEFAULT '[]'::jsonb;

-- Create index for efficient queries on streak data
CREATE INDEX IF NOT EXISTS idx_users_current_streak ON users(current_streak);
CREATE INDEX IF NOT EXISTS idx_users_best_streak ON users(best_streak);

COMMENT ON COLUMN users.best_streak IS 'User''s all-time best streak of consecutive days with entries';
COMMENT ON COLUMN users.current_streak IS 'User''s current active streak of consecutive days with entries';
COMMENT ON COLUMN users.current_streak_date IS 'Date of the last entry in the current streak';
COMMENT ON COLUMN users.completion_samples IS 'Array of monthly completion samples: [{month: "YYYY-MM", completion: 0.45, entries: 14, days: 31}]';
