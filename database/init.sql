-- Initialize PostgreSQL database with required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE transaction_type AS ENUM ('purchase', 'usage', 'bonus', 'refund');
CREATE TYPE content_type AS ENUM ('image', 'video');