-- Users table (replaces auth.users from Supabase)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  email_confirmed BOOLEAN DEFAULT false,
  email_confirm_token TEXT,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- User profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  is_admin BOOLEAN DEFAULT false,
  is_suspended BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  credits INTEGER DEFAULT 10,
  image_credits INTEGER DEFAULT 10,
  video_credits INTEGER DEFAULT 0,
  total_images_generated INTEGER DEFAULT 0,
  total_credits_used INTEGER DEFAULT 0,
  total_credits_granted INTEGER DEFAULT 0,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Image history table
CREATE TABLE image_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Local file system path
  prompt TEXT NOT NULL,
  style TEXT,
  liked BOOLEAN DEFAULT false,
  content_type content_type DEFAULT 'image',
  file_extension TEXT DEFAULT '.png',
  settings JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL,
  extension_count INTEGER DEFAULT 0,
  last_extended_at TIMESTAMPTZ,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Presets table
CREATE TABLE presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  positive_prompt TEXT,
  negative_prompt TEXT,
  selected_style TEXT,
  aspect_ratio JSONB,
  steps INTEGER DEFAULT 30,
  cfg_scale NUMERIC DEFAULT 7,
  custom_width INTEGER,
  custom_height INTEGER,
  use_custom_dimensions BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TOTP settings table
CREATE TABLE totp_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  backup_codes TEXT[] DEFAULT '{}',
  enrolled_at TIMESTAMPTZ,
  last_used TIMESTAMPTZ,
  recovery_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit transactions table
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type transaction_type NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table for JWT management
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_is_admin ON user_profiles(is_admin);
CREATE INDEX idx_image_history_user_id ON image_history(user_id);
CREATE INDEX idx_image_history_expires_at ON image_history(expires_at);
CREATE INDEX idx_image_history_created_at ON image_history(created_at DESC);
CREATE INDEX idx_presets_user_id ON presets(user_id);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_image_history_updated_at 
  BEFORE UPDATE ON image_history 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_presets_updated_at 
  BEFORE UPDATE ON presets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_totp_settings_updated_at 
  BEFORE UPDATE ON totp_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile automatically
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (
    id, 
    email, 
    display_name, 
    is_admin,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.display_name,
    CASE 
      WHEN NEW.email = ANY(string_to_array(current_setting('app.admin_emails', true), ',')) 
      THEN true 
      ELSE false 
    END,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create user profile
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Schedule cleanup task to run daily at 2 AM
SELECT cron.schedule('cleanup-expired-images', '0 2 * * *', $$
  DELETE FROM image_history WHERE expires_at < NOW();
$$);