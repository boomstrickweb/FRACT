import { supabase } from '../lib/supabase';
import { validateEmail, sanitizeUserInput } from './securityService';

export interface EmailAuthResponse {
  success: boolean;
  message: string;
  verificationId?: string;
}

export interface OTPVerificationResponse {
  success: boolean;
  message: string;
  user?: any;
}

// Send OTP to email using Supabase Auth
export const sendEmailOTP = async (email: string): Promise<EmailAuthResponse> => {
  try {
    // Validate and sanitize email
    const sanitizedEmail = sanitizeUserInput(email.toLowerCase().trim());

    if (!validateEmail(sanitizedEmail)) {
      return {
        success: false,
        message: 'Please enter a valid email address.',
      };
    }
    // Use Supabase's built-in email authentication with OTP
    const { error } = await supabase.auth.signInWithOtp({
      email: sanitizedEmail,
      options: {
        shouldCreateUser: true,
      }
    });

    if (error) {
      console.error('Error sending OTP:', error);
      
      // Handle specific error cases
      if (error.message.includes('rate limit')) {
        return {
          success: false,
          message: 'Too many requests. Please wait a moment before trying again.',
        };
      }
      
      if (error.message.includes('invalid email')) {
        return {
          success: false,
          message: 'Please enter a valid email address.',
        };
      }

      return {
        success: false,
        message: error.message.includes('Error sending magic link email') || error.message.includes('unexpected_failure')
          ? 'Email service is currently unavailable. Please check your Supabase email configuration or try again later.'
          : error.message || 'Failed to send verification code. Please try again.',
      };
    }

    console.log('📧 OTP sent successfully to:', email);

    return {
      success: true,
      message: 'Verification code sent successfully!',
    };
  } catch (error) {
    console.error('Error in sendEmailOTP:', error);
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again.',
    };
  }
};

// Verify email OTP code using Supabase Auth
export const verifyEmailOTP = async (
  email: string,
  otpCode: string
): Promise<OTPVerificationResponse> => {
  try {
    // Sanitize inputs
    const sanitizedEmail = sanitizeUserInput(email.toLowerCase().trim());
    const sanitizedOTP = sanitizeUserInput(otpCode.trim());

    // Validate OTP format (should be 6 digits)
    if (!/^\d{6}$/.test(sanitizedOTP)) {
      return {
        success: false,
        message: 'Invalid verification code format.',
      };
    }

    // Verify the OTP with Supabase Auth
    const { data, error } = await supabase.auth.verifyOtp({
      email: sanitizedEmail,
      token: sanitizedOTP,
      type: 'email',
    });

    if (error) {
      console.error('Error verifying OTP:', error);
      
      // Handle specific error cases
      if (error.message.includes('expired')) {
        return {
          success: false,
          message: 'Verification code has expired. Please request a new one.',
        };
      }
      
      if (error.message.includes('invalid')) {
        return {
          success: false,
          message: 'Invalid verification code. Please try again.',
        };
      }

      return {
        success: false,
        message: error.message || 'Failed to verify code. Please try again.',
      };
    }

    console.log('✅ OTP verified successfully for:', email);

    return {
      success: true,
      message: 'Email verified successfully!',
      user: data.user,
    };
  } catch (error) {
    console.error('Error in verifyEmailOTP:', error);
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again.',
    };
  }
};

// Get current user profile
export const getCurrentUserProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return { user, profile };
  } catch (error) {
    console.error('Error in getCurrentUserProfile:', error);
    return null;
  }
};

// Sign out user
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in signOut:', error);
    return false;
  }
};