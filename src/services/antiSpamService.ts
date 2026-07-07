import { supabase } from '../lib/supabase';

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  message?: string;
  retryAfter?: string;
  secondsRemaining?: number;
  cooldownConfig?: any;
}

export interface DuplicateCheckResult {
  allowed: boolean;
  reason?: string;
  message?: string;
  duplicateCount?: number;
  fingerprint?: string;
  penaltyUntil?: string;
}

export const checkPostRateLimit = async (userId: string): Promise<RateLimitResult> => {
  try {
    const { data, error } = await supabase.rpc('check_post_rate_limit', {
      p_user_id: userId
    });

    if (error) {
      console.error('Rate limit check failed:', error);
      return {
        allowed: false,
        reason: 'error',
        message: 'Unable to verify posting eligibility. Please try again.'
      };
    }

    return data as RateLimitResult;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return {
      allowed: false,
      reason: 'error',
      message: 'An unexpected error occurred. Please try again.'
    };
  }
};

export const checkDuplicatePost = async (
  userId: string,
  content: string
): Promise<DuplicateCheckResult> => {
  try {
    const { data, error } = await supabase.rpc('check_duplicate_post', {
      p_user_id: userId,
      p_content: content
    });

    if (error) {
      console.error('Duplicate check failed:', error);
      return {
        allowed: false,
        reason: 'error',
        message: 'Unable to verify content. Please try again.'
      };
    }

    return data as DuplicateCheckResult;
  } catch (error) {
    console.error('Error checking duplicate:', error);
    return {
      allowed: false,
      reason: 'error',
      message: 'An unexpected error occurred. Please try again.'
    };
  }
};

export const recordPostAttempt = async (
  userId: string,
  postId: string,
  content: string
): Promise<void> => {
  try {
    const { error } = await supabase.rpc('record_post_attempt', {
      p_user_id: userId,
      p_post_id: postId,
      p_content: content
    });

    if (error) {
      console.error('Failed to record post attempt:', error);
    }
  } catch (error) {
    console.error('Error recording post attempt:', error);
  }
};

export const getUserRateLimitStatus = async (userId: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('post_rate_limits')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to get rate limit status:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    return null;
  }
};

export const getUserViolations = async (userId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('spam_violations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Failed to get violations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting violations:', error);
    return [];
  }
};

export const formatRetryMessage = (result: RateLimitResult): string => {
  if (result.secondsRemaining !== undefined) {
    const minutes = Math.floor(result.secondsRemaining / 60);
    const seconds = result.secondsRemaining % 60;

    if (minutes > 0) {
      return `${result.message} (${minutes}m ${seconds}s remaining)`;
    } else {
      return `${result.message} (${seconds}s remaining)`;
    }
  }

  return result.message || 'Please wait before posting again.';
};
