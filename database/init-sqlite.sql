-- SQLite version of the database initialization script
-- Create users table
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    google_id TEXT UNIQUE,
    photo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create user profiles table
CREATE TABLE user_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    is_admin BOOLEAN DEFAULT FALSE,
    image_credits INTEGER DEFAULT 5,
    video_credits INTEGER DEFAULT 0,
    total_credits_granted INTEGER DEFAULT 5,
    total_credits_used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create image history table
CREATE TABLE image_history (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    style TEXT,
    liked BOOLEAN DEFAULT FALSE,
    content_type TEXT DEFAULT 'image',
    file_extension TEXT DEFAULT '.png',
    steps INTEGER DEFAULT 30,
    cfg_scale REAL DEFAULT 7.0,
    aspect_ratio TEXT DEFAULT 'Square (1:1)',
    negative_prompt TEXT DEFAULT '',
    width INTEGER DEFAULT 1024,
    height INTEGER DEFAULT 1024,
    is_custom_dimensions BOOLEAN DEFAULT FALSE,
    total_pixels INTEGER DEFAULT 1048576,
    megapixels REAL DEFAULT 1.05,
    video_duration INTEGER,
    video_fps INTEGER,
    video_format TEXT,
    video_with_audio BOOLEAN,
    video_resolution TEXT,
    expires_at DATETIME,
    extension_count INTEGER DEFAULT 0,
    last_extended_at DATETIME,
    is_expired BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create presets table
CREATE TABLE presets (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    positive_prompt TEXT NOT NULL,
    negative_prompt TEXT DEFAULT '',
    selected_style TEXT NOT NULL,
    aspect_ratio TEXT DEFAULT 'Square (1:1)',
    steps INTEGER DEFAULT 30,
    cfg_scale REAL DEFAULT 7.0,
    custom_width INTEGER,
    custom_height INTEGER,
    use_custom_dimensions BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create file storage table
CREATE TABLE file_storage (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    content_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create credit transactions table (optional)
CREATE TABLE credit_transactions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL, -- 'deduction', 'grant', 'refund'
    credit_type TEXT NOT NULL, -- 'image', 'video'
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert admin user for jerome@rotz.host
INSERT OR REPLACE INTO users (id, email, display_name, google_id) 
VALUES ('admin-jerome', 'jerome@rotz.host', 'Jerome Levy', null);

INSERT OR REPLACE INTO user_profiles (user_id, is_admin, image_credits, video_credits, total_credits_granted) 
VALUES ('admin-jerome', TRUE, 999999, 999999, 999999);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_image_history_user_id ON image_history(user_id);
CREATE INDEX idx_image_history_created_at ON image_history(created_at);
CREATE INDEX idx_presets_user_id ON presets(user_id);
CREATE INDEX idx_file_storage_user_id ON file_storage(user_id);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);