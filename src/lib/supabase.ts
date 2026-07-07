import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.')
  console.error('Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY')
  console.error('Current values:', { supabaseUrl, supabaseAnonKey })
}

// Provide fallback values to prevent client creation errors
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
)

export type Database = {
  public: {
    Tables: {
      blocked_users: {
        Row: {
          id: string
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: {
          id?: string
          blocker_id: string
          blocked_id: string
          created_at?: string
        }
        Update: {
          id?: string
          blocker_id?: string
          blocked_id?: string
          created_at?: string
        }
      }
      muted_users: {
        Row: {
          id: string
          muter_id: string
          muted_id: string
          created_at: string
        }
        Insert: {
          id?: string
          muter_id: string
          muted_id: string
          created_at?: string
        }
        Update: {
          id?: string
          muter_id?: string
          muted_id?: string
          created_at?: string
        }
      }
      user_reports: {
        Row: {
          id: string
          reporter_id: string
          reported_id: string
          reason: string
          report_type: string
          description: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          reported_id: string
          reason: string
          report_type?: string
          description?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          reported_id?: string
          reason?: string
          report_type?: string
          description?: string | null
          status?: string
          created_at?: string
        }
      }
      post_reports: {
        Row: {
          id: string
          reporter_id: string
          post_id: string
          reported_user_id: string
          reason: string
          description: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          post_id: string
          reported_user_id: string
          reason?: string
          description?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          post_id?: string
          reported_user_id?: string
          reason?: string
          description?: string | null
          status?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          phone_number: string
          country_code: string
          is_verified: boolean
          verification_type?: string
          username?: string
          name?: string
          bio?: string
          profile_pic_url?: string
          beliefs?: string
          field?: string
          cover_pic_url?: string
          profile_completed: boolean
          show_following: boolean
          show_respected_posts: boolean
          show_rejected_posts: boolean
          show_observed_posts: boolean
          is_deactivated: boolean
          deactivated_at?: string
          two_factor_enabled: boolean
          password_hash?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          phone_number: string
          country_code: string
          is_verified?: boolean
          verification_type?: string
          username?: string
          name?: string
          bio?: string
          profile_pic_url?: string
          beliefs?: string
          field?: string
          cover_pic_url?: string
          profile_completed?: boolean
          show_following?: boolean
          show_respected_posts?: boolean
          show_rejected_posts?: boolean
          show_observed_posts?: boolean
          is_deactivated?: boolean
          deactivated_at?: string
          two_factor_enabled?: boolean
          password_hash?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phone_number?: string
          country_code?: string
          is_verified?: boolean
          verification_type?: string
          verification_reason?: string
          username?: string
          name?: string
          bio?: string
          profile_pic_url?: string
          beliefs?: string
          field?: string
          cover_pic_url?: string
          profile_completed?: boolean
          show_following?: boolean
          show_respected_posts?: boolean
          show_rejected_posts?: boolean
          show_observed_posts?: boolean
          is_deactivated?: boolean
          deactivated_at?: string
          two_factor_enabled?: boolean
          password_hash?: string
          created_at?: string
          updated_at?: string
        }
      }
      phone_verifications: {
        Row: {
          id: string
          phone_number: string
          otp_code: string
          expires_at: string
          verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          phone_number: string
          otp_code: string
          expires_at: string
          verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          phone_number?: string
          otp_code?: string
          expires_at?: string
          verified?: boolean
          created_at?: string
        }
      }
      user_verifications: {
        Row: {
          id: string
          user_id: string
          verification_type: string
          verification_reason: string
          verified_at: string
          verified_by?: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          verification_type?: string
          verification_reason: string
          verified_at?: string
          verified_by?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          verification_type?: string
          verification_reason?: string
          verified_at?: string
          verified_by?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}