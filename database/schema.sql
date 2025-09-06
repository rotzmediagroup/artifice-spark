-- PostgreSQL schema for ROTZ Image Generator
-- Complete replacement for Firebase Firestore

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (replaces Firebase Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) DEFAULT '',
    photo_url TEXT DEFAULT '',
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table (maps to userProfiles collection)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) DEFAULT '',
    photo_url TEXT DEFAULT '',
    credits INTEGER DEFAULT 0, -- Legacy field for backwards compatibility
    image_credits INTEGER DEFAULT 0,
    video_credits INTEGER DEFAULT 0,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_credits_granted INTEGER DEFAULT 0,
    total_credits_used INTEGER DEFAULT 0,
    -- MFA fields
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_enabled_at TIMESTAMP WITH TIME ZONE,
    -- Account status fields
    is_active BOOLEAN DEFAULT TRUE,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspended_at TIMESTAMP WITH TIME ZONE,
    suspended_by VARCHAR(255),
    suspension_reason TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by VARCHAR(255),
    delete_reason TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Image history table (maps to users/{uid}/imageHistory subcollection)
CREATE TABLE image_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    style VARCHAR(255) NOT NULL,
    liked BOOLEAN DEFAULT FALSE,
    content_type VARCHAR(50) DEFAULT 'image', -- 'image' or 'video'
    file_extension VARCHAR(10) DEFAULT '.png',
    -- Settings
    steps INTEGER DEFAULT 30,
    cfg_scale DECIMAL(3,1) DEFAULT 7.0,
    aspect_ratio VARCHAR(255) DEFAULT 'Square (1:1)',
    negative_prompt TEXT DEFAULT '',
    width INTEGER,
    height INTEGER,
    is_custom_dimensions BOOLEAN DEFAULT FALSE,
    total_pixels BIGINT,
    megapixels DECIMAL(4,2),
    -- Video-specific settings
    video_duration INTEGER,
    video_fps INTEGER,
    video_format VARCHAR(50),
    video_with_audio BOOLEAN,
    video_resolution VARCHAR(50),
    -- Auto-deletion fields
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    extension_count INTEGER DEFAULT 0,
    last_extended_at TIMESTAMP WITH TIME ZONE,
    is_expired BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Presets table (maps to users/{uid}/presets subcollection)
CREATE TABLE presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    positive_prompt TEXT NOT NULL,
    negative_prompt TEXT DEFAULT '',
    selected_style VARCHAR(255) NOT NULL,
    -- Aspect ratio
    aspect_ratio_label VARCHAR(255),
    aspect_ratio_value VARCHAR(255),
    aspect_ratio_width INTEGER,
    aspect_ratio_height INTEGER,
    aspect_ratio_category VARCHAR(255),
    steps INTEGER DEFAULT 30,
    cfg_scale DECIMAL(3,1) DEFAULT 7.0,
    -- Enhanced dimension data
    custom_width INTEGER DEFAULT 1024,
    custom_height INTEGER DEFAULT 1024,
    use_custom_dimensions BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TOTP settings table (maps to totpSettings collection)
CREATE TABLE totp_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    enabled BOOLEAN DEFAULT FALSE,
    secret VARCHAR(255),
    backup_codes TEXT[], -- Array of backup codes
    enrolled_at TIMESTAMP WITH TIME ZONE,
    last_used TIMESTAMP WITH TIME ZONE,
    recovery_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit transactions table (maps to creditTransactions collection)
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'earned', 'spent', 'granted', 'expired'
    amount INTEGER NOT NULL,
    credit_type VARCHAR(50) NOT NULL, -- 'image', 'video', 'general'
    description TEXT,
    -- Transaction metadata
    transaction_reference VARCHAR(255), -- External reference ID
    source VARCHAR(255), -- 'generation', 'admin_grant', 'purchase', etc.
    metadata JSONB, -- Additional flexible metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File storage table (replaces Firebase Storage)
CREATE TABLE file_storage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_path TEXT NOT NULL,
    file_size BIGINT,
    content_type VARCHAR(255),
    upload_type VARCHAR(50), -- 'reference-image', 'generated-image', 'generated-video'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_is_admin ON user_profiles(is_admin);

CREATE INDEX idx_image_history_user_id ON image_history(user_id);
CREATE INDEX idx_image_history_timestamp ON image_history(timestamp DESC);
CREATE INDEX idx_image_history_expires_at ON image_history(expires_at);
CREATE INDEX idx_image_history_liked ON image_history(liked);
CREATE INDEX idx_image_history_content_type ON image_history(content_type);

CREATE INDEX idx_presets_user_id ON presets(user_id);
CREATE INDEX idx_presets_timestamp ON presets(timestamp DESC);

CREATE INDEX idx_totp_settings_user_id ON totp_settings(user_id);
CREATE INDEX idx_totp_settings_enabled ON totp_settings(enabled);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

CREATE INDEX idx_file_storage_user_id ON file_storage(user_id);
CREATE INDEX idx_file_storage_upload_type ON file_storage(upload_type);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_image_history_updated_at BEFORE UPDATE ON image_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_presets_updated_at BEFORE UPDATE ON presets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_totp_settings_updated_at BEFORE UPDATE ON totp_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: 'admin123' - change in production!)
INSERT INTO users (email, password_hash, display_name, email_verified) VALUES 
('jerome@rotz.host', '$2b$10$8K1p/a0dClPso1wkFyGH.OEm3GvKlPW1m0rJ5bYpXN2K/YE.U1VW6', 'Jerome Admin', true);

-- Create admin profile
INSERT INTO user_profiles (user_id, email, display_name, is_admin, image_credits, video_credits) 
SELECT id, email, display_name, true, 999999, 999999 FROM users WHERE email = 'jerome@rotz.host';