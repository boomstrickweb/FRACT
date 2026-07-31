import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// For storage operations, we want to use the CDN if available
// NOTE: We don't replace the host in the client config anymore to avoid double-transformation
// and because we handle transformation explicitly with getCDNUrl/wrapMediaUrl.
const storageUrl = supabaseUrl;

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

// Add storage proxy if it was not already handled by createClient
// Note: We can't easily change the storage URL after client creation 
// without re-implementing bits of the library or using a proxy.
// However, we are wrapping getPublicUrl in components.

/**
 * Transforms a Supabase storage URL to use the FRACT CDN.
 * Only transforms URLs containing /storage/v1
 */
export const getCDNUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  // Normalize URL to string if it's not
  let urlStr = String(url);

  // If it's already a CDN URL
  if (urlStr.includes('cdn.fract.online')) {
    // Ensure it has https protocol
    if (!urlStr.startsWith('http')) {
      urlStr = `https://${urlStr.replace(/^\/+/, '')}`;
    }
    return urlStr;
  }
  
  // Handle Supabase storage URLs
  if (urlStr.includes('/storage/v1')) {
    // Basic cleanup for double slashes if any (except after protocol)
    urlStr = urlStr.replace(/([^:])\/\//g, '$1/');
    
    try {
      const urlObj = new URL(urlStr);
      const pathParts = urlObj.pathname.split('/');
      // Supabase storage path: /storage/v1/object/public/bucket/path...
      const publicIndex = pathParts.indexOf('public');
      if (publicIndex !== -1 && pathParts.length > publicIndex + 1) {
        const bucket = pathParts[publicIndex + 1];
        const rest = pathParts.slice(publicIndex + 2).join('/');
        // If there's no rest, it might be just the bucket, but usually it's bucket/file
        if (rest) {
          return `https://cdn.fract.online/${bucket}/${rest}`;
        }
      }

      // Handle cases where 'public' is not in the path but it's still a Supabase storage URL
      // Pattern: /storage/v1/object/bucket/path...
      const objectIndex = pathParts.indexOf('object');
      if (objectIndex !== -1 && pathParts.length > objectIndex + 2) {
        const bucket = pathParts[objectIndex + 1];
        const rest = pathParts.slice(objectIndex + 2).join('/');
        return `https://cdn.fract.online/${bucket}/${rest}`;
      }

      // Fallback: just replace the host if it's a known Supabase host
      if (urlStr.includes('.supabase.co')) {
        const host = urlObj.host;
        return urlStr.replace(host, 'cdn.fract.online');
      }
    } catch (e) {
      // Fallback if URL parsing fails
      return urlStr.replace(/.*supabase\.co\/storage\/v1\/object\/public\//, 'https://cdn.fract.online/');
    }
  }

  // Handle direct Supabase URLs that might not have /storage/v1 but are in the database
  if (urlStr.includes('.supabase.co')) {
    // Try to extract bucket and path from URLs like https://xyz.supabase.co/storage/v1/object/public/bucket/path
    const storageMatch = urlStr.match(/\/storage\/v1\/object\/(?:public\/)?([^/]+)\/(.+)$/);
    if (storageMatch) {
      return `https://cdn.fract.online/${storageMatch[1]}/${storageMatch[2]}`;
    }
    return urlStr.replace(/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\//, 'https://cdn.fract.online/');
  }

  return urlStr;
};

/**
 * Hook or helper to wrap common storage URL usage.
 * Supports both Supabase and R2 URLs.
 */
export const wrapMediaUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  const cdnUrl = getCDNUrl(url);
  
  // If getCDNUrl didn't do anything but it's a relative path, we might need to prefix it
  // (though in this project most paths seem to be full URLs or at least contain storage markers)
  
  return cdnUrl;
};

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