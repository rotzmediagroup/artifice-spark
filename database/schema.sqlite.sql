-- SQLite schema for rotz_image_generator
-- Converted from PostgreSQL to SQLite

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY,
    is_admin BOOLEAN DEFAULT 0,
    image_credits INTEGER DEFAULT 5,
    video_credits INTEGER DEFAULT 0,
    total_credits_granted INTEGER DEFAULT 5,
    total_credits_used INTEGER DEFAULT 0,
    totp_secret TEXT,
    totp_enabled BOOLEAN DEFAULT 0,
    settings TEXT DEFAULT '{}', -- JSON stored as text
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Image history table
CREATE TABLE IF NOT EXISTS image_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    style TEXT,
    liked BOOLEAN DEFAULT 0,
    content_type TEXT DEFAULT 'image',
    file_extension TEXT DEFAULT '.png',
    steps INTEGER DEFAULT 30,
    cfg_scale REAL DEFAULT 7,
    aspect_ratio TEXT DEFAULT 'Square (1:1)',
    negative_prompt TEXT,
    width INTEGER DEFAULT 1024,
    height INTEGER DEFAULT 1024,
    is_custom_dimensions BOOLEAN DEFAULT 0,
    total_pixels INTEGER DEFAULT 1048576,
    megapixels REAL DEFAULT 1.05,
    video_duration INTEGER,
    video_fps INTEGER,
    video_format TEXT,
    video_with_audio BOOLEAN,
    video_resolution TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    extension_count INTEGER DEFAULT 0,
    last_extended_at DATETIME,
    is_expired BOOLEAN DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Presets table
CREATE TABLE IF NOT EXISTS presets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    positive_prompt TEXT,
    negative_prompt TEXT,
    selected_style TEXT,
    aspect_ratio_label TEXT,
    aspect_ratio_value TEXT,
    aspect_ratio_width INTEGER,
    aspect_ratio_height INTEGER,
    aspect_ratio_category TEXT,
    steps INTEGER DEFAULT 30,
    cfg_scale REAL DEFAULT 7,
    custom_width INTEGER DEFAULT 1024,
    custom_height INTEGER DEFAULT 1024,
    use_custom_dimensions BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Credit transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    credit_type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- File storage table
CREATE TABLE IF NOT EXISTS file_storage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    content_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_image_history_user_id ON image_history(user_id);
CREATE INDEX IF NOT EXISTS idx_image_history_expires ON image_history(expires_at);
CREATE INDEX IF NOT EXISTS idx_presets_user_id ON presets(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_file_storage_user_id ON file_storage(user_id);

-- Insert default admin user for jerome@rotz.host
INSERT OR IGNORE INTO users (id, email, display_name, created_at, last_login)
VALUES ('admin-jerome', 'jerome@rotz.host', 'Jerome Levy', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO user_profiles (user_id, is_admin, image_credits, video_credits, total_credits_granted, total_credits_used)
VALUES ('admin-jerome', 1, 999999, 999999, 999999, 0);