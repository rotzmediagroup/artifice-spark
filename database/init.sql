-- PostgreSQL schema for rotz_image_generator

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    photo_url TEXT,
    google_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    is_admin BOOLEAN DEFAULT FALSE,
    image_credits INTEGER DEFAULT 5,
    video_credits INTEGER DEFAULT 0,
    total_credits_granted INTEGER DEFAULT 5,
    total_credits_used INTEGER DEFAULT 0,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_suspended BOOLEAN DEFAULT FALSE,
    settings JSONB DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Image history table
CREATE TABLE IF NOT EXISTS image_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    style VARCHAR(255),
    liked BOOLEAN DEFAULT FALSE,
    content_type VARCHAR(50) DEFAULT 'image',
    file_extension VARCHAR(10) DEFAULT '.png',
    steps INTEGER DEFAULT 30,
    cfg_scale NUMERIC(4,2) DEFAULT 7,
    aspect_ratio VARCHAR(100) DEFAULT 'Square (1:1)',
    negative_prompt TEXT,
    width INTEGER DEFAULT 1024,
    height INTEGER DEFAULT 1024,
    is_custom_dimensions BOOLEAN DEFAULT FALSE,
    total_pixels INTEGER DEFAULT 1048576,
    megapixels NUMERIC(5,2) DEFAULT 1.05,
    video_duration INTEGER,
    video_fps INTEGER,
    video_format VARCHAR(50),
    video_with_audio BOOLEAN,
    video_resolution VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    extension_count INTEGER DEFAULT 0,
    last_extended_at TIMESTAMP,
    is_expired BOOLEAN DEFAULT FALSE
);

-- Presets table
CREATE TABLE IF NOT EXISTS presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    positive_prompt TEXT,
    negative_prompt TEXT,
    selected_style VARCHAR(255),
    aspect_ratio JSONB,
    steps INTEGER DEFAULT 30,
    cfg_scale NUMERIC(4,2) DEFAULT 7,
    custom_width INTEGER DEFAULT 1024,
    custom_height INTEGER DEFAULT 1024,
    use_custom_dimensions BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credit transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL,
    credit_type VARCHAR(50) NOT NULL,
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reason TEXT,
    admin_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- File storage table
CREATE TABLE IF NOT EXISTS file_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_type VARCHAR(50) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    content_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_image_history_user_id ON image_history(user_id);
CREATE INDEX IF NOT EXISTS idx_image_history_expires ON image_history(expires_at);
CREATE INDEX IF NOT EXISTS idx_presets_user_id ON presets(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_file_storage_user_id ON file_storage(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for user_profiles
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user for jerome@rotz.host
INSERT INTO users (email, display_name, created_at, last_login)
VALUES ('jerome@rotz.host', 'Jerome Levy', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Create admin profile
INSERT INTO user_profiles (user_id, is_admin, image_credits, video_credits, total_credits_granted, total_credits_used)
SELECT id, TRUE, 999999, 999999, 999999, 0
FROM users
WHERE email = 'jerome@rotz.host'
ON CONFLICT (user_id) DO NOTHING;