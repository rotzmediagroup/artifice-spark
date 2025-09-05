import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Database types
export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  is_admin: boolean;
  is_suspended: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  credits: number;
  total_images_generated: number;
  last_login?: string;
}

export interface ImageHistory {
  id: string;
  user_id: string;
  prompt: string;
  url: string;
  model: string;
  dimensions: string;
  created_at: string;
  expires_at: string;
  metadata?: Record<string, any>;
}

export interface TOTPSettings {
  id: string;
  user_id: string;
  secret: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'purchase' | 'usage' | 'bonus' | 'refund';
  description: string;
  created_at: string;
  metadata?: Record<string, any>;
}