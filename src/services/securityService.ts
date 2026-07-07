import { supabase } from '../lib/supabase';

export interface SecurityEvent {
  eventType: string;
  eventDetails?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export const logSecurityEvent = async (
  userId: string,
  event: SecurityEvent
): Promise<void> => {
  try {
    const { error } = await supabase.rpc('log_security_event', {
      p_user_id: userId,
      p_event_type: event.eventType,
      p_event_details: event.eventDetails || {},
      p_ip_address: event.ipAddress || null,
      p_user_agent: event.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null)
    });

    if (error) {
      console.error('Failed to log security event:', error);
    }
  } catch (error) {
    console.error('Error logging security event:', error);
  }
};

export const checkRateLimit = async (
  userId: string,
  actionType: string,
  maxActions: number = 5,
  windowMinutes: number = 60
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_user_id: userId,
      p_action_type: actionType,
      p_max_actions: maxActions,
      p_window_minutes: windowMinutes
    });

    if (error) {
      console.error('Rate limit check failed:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return false;
  }
};

export const sanitizeUserInput = (input: string): string => {
  if (!input) return '';

  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
};

export const sanitizeProfileData = (profile: any): any => {
  if (!profile) return null;

  const sanitized = { ...profile };

  delete sanitized.password_hash;
  delete sanitized.phone_number;
  delete sanitized.country_code;
  delete sanitized.two_factor_enabled;

  if (sanitized.email) {
    const emailParts = sanitized.email.split('@');
    if (emailParts.length === 2) {
      const username = emailParts[0];
      const domain = emailParts[1];
      if (username.length > 2) {
        sanitized.email = `${username.substring(0, 2)}***@${domain}`;
      }
    }
  }

  return sanitized;
};

export const sanitizeExportData = (data: any): any => {
  if (!data) return null;

  const sanitized: any = {};

  if (data.profile) {
    sanitized.profile = {
      id: data.profile.id,
      username: data.profile.username,
      name: data.profile.name,
      bio: data.profile.bio,
      profile_pic_url: data.profile.profile_pic_url,
      cover_pic_url: data.profile.cover_pic_url,
      beliefs: data.profile.beliefs,
      field: data.profile.field,
      profile_type: data.profile.profile_type,
      trust_score: data.profile.trust_score,
      is_verified: data.profile.is_verified,
      created_at: data.profile.created_at,
      updated_at: data.profile.updated_at
    };
  }

  if (data.posts) {
    sanitized.posts = data.posts.map((post: any) => ({
      id: post.id,
      content: post.content,
      post_type: post.post_type,
      quote_signature: post.quote_signature,
      perspective_lock: post.perspective_lock,
      source_type: post.source_type,
      source_description: post.source_description,
      created_at: post.created_at,
      updated_at: post.updated_at
    }));
  }

  if (data.reactions) {
    sanitized.reactions = data.reactions.map((reaction: any) => ({
      reaction_type: reaction.reaction_type,
      created_at: reaction.created_at
    }));
  }

  if (data.follows) {
    sanitized.follows = {
      followers_count: data.follows.followers?.length || 0,
      following_count: data.follows.following?.length || 0
    };
  }

  if (data.savedPosts) {
    sanitized.savedPosts = data.savedPosts.map((saved: any) => ({
      saved_at: saved.created_at
    }));
  }

  if (data.sessions) {
    sanitized.sessions = data.sessions.map((session: any) => ({
      device_name: session.device_name,
      location: session.location,
      last_active: session.last_active,
      created_at: session.created_at
    }));
  }

  return sanitized;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

export const isStrongPassword = (password: string): boolean => {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
};
