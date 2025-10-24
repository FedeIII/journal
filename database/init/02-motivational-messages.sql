-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Create motivational_messages table
CREATE TABLE IF NOT EXISTS motivational_messages (
    id SERIAL PRIMARY KEY,
    message_text TEXT NOT NULL,
    context VARCHAR(50) NOT NULL CHECK (context IN ('login', 'entry', 'both')),
    tone VARCHAR(50),
    length VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create message_interactions table for tracking
CREATE TABLE IF NOT EXISTS message_interactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES motivational_messages(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    context VARCHAR(50) NOT NULL CHECK (context IN ('login', 'register', 'entry')),
    user_state VARCHAR(50) NOT NULL CHECK (user_state IN ('new_visitor', 'no_entries', 'has_entries')),
    outcome VARCHAR(50) CHECK (outcome IN ('registered', 'wrote_first_entry', 'wrote_entry', 'left')),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for message_interactions
CREATE INDEX idx_message_interactions_message_id ON message_interactions(message_id);
CREATE INDEX idx_message_interactions_user_id ON message_interactions(user_id);
CREATE INDEX idx_message_interactions_session_id ON message_interactions(session_id);

-- Create trigger for motivational_messages updated_at
CREATE TRIGGER update_motivational_messages_updated_at BEFORE UPDATE ON motivational_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed initial motivational messages with variations
INSERT INTO motivational_messages (message_text, context, tone, length) VALUES
    ('Capture both sides of the camera. Write what happened today and how you felt about it. Your thoughts, your fears, your desires. Write about the objective events and also who you were and how you lived them in that moment.

I''ll show you this same date from every year you''ve written. Watch yourself evolve. See what truly mattered. Get the perspective that keeps those dark nights of the soul at bay. Remember who you are and where you''re going. Learn who do you want to be and what you accomplished.',
    'both', 'inspirational', 'long'),

    ('Every day is a snapshot of who you are. Capture it.',
    'both', 'minimalist', 'short'),

    ('This isn''t just a diary—it''s a time machine. Write today, understand yourself tomorrow, see your growth years from now.',
    'login', 'casual', 'medium'),

    ('Think of this as two photos: one of what happened, one of how you felt. Both matter. Both fade if you don''t write them down.',
    'entry', 'metaphorical', 'medium'),

    ('Who were you last year on this date? What mattered to you? You won''t remember unless you write it down. Start today.',
    'login', 'direct', 'medium'),

    ('Your future self is looking back. What do you want them to see? Write it down.',
    'entry', 'reflective', 'short'),

    ('Life moves fast. This is where you pause, reflect, and remember. Not just what happened—but who you were when it happened.',
    'both', 'contemplative', 'medium'),

    ('Track your evolution. Every entry is a data point in the story of becoming who you are.',
    'login', 'analytical', 'short'),

    ('Don''t let today disappear. Write what happened and how it felt. Your future self will thank you.',
    'entry', 'urgent', 'short'),

    ('Same date, different years, different you. See how far you''ve come. See who you''re becoming.',
    'both', 'perspective', 'short'),

    ('Record the events. Record your feelings. Record your lens on the world. Years from now, you''ll look back and finally understand your own journey.',
    'entry', 'comprehensive', 'long'),

    ('Most journals die in February. This one won''t—because you can see your progress across years. Every entry compounds.',
    'login', 'motivational', 'medium'),

    ('Write like you''re leaving a message for your future self. Because you are.',
    'both', 'simple', 'short'),

    ('What''s truly important? You''ll know when you compare today''s entry with last year''s. Pattern recognition starts with data collection.',
    'entry', 'practical', 'medium'),

    ('This is your anti-anxiety tool. When you wonder where you''re going, look back at where you''ve been. The path becomes clear.',
    'login', 'therapeutic', 'medium')
ON CONFLICT DO NOTHING;
