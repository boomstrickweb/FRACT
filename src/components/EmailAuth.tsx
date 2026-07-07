import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import EmailInput from './EmailInput';
import OTPVerification from './OTPVerification';
import SuccessScreen from './SuccessScreen';
import PasswordVerification from './PasswordVerification';
import ActionPassword from './ActionPassword';
import { sendEmailOTP, verifyEmailOTP } from '../services/authService';
import { supabase } from '../lib/supabase';
import { createUserSession } from '../services/sessionService';

interface EmailAuthProps {
  onBack: () => void;
  onAuthSuccess: () => void;
  onNavigateToTOS: () => void;
  onNavigateToPP: () => void;
}

type AuthStep = 'email' | 'otp' | 'password' | 'action_password' | 'success';

const EmailAuth: React.FC<EmailAuthProps> = ({ onBack, onAuthSuccess, onNavigateToTOS, onNavigateToPP }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailSubmit = async (emailAddress: string) => {
    setIsLoading(true);
    setError('');

    try {
      // First, validate the email against disposable email list
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing');
      }

      const validationUrl = `${supabaseUrl}/functions/v1/validate-email`;

      const validationResponse = await fetch(validationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ email: emailAddress }),
      });

      const validationData = await validationResponse.json();

      if (!validationData.valid) {
        setError(validationData.message || 'This email address is not allowed.');
        setIsLoading(false);
        return;
      }

      // New IP and Anti-VPN/Country check
      const verifyIpUrl = `${supabaseUrl}/functions/v1/verify-ip`;
      const verifyIpResponse = await fetch(verifyIpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ email: emailAddress }),
      });

      const verifyIpData = await verifyIpResponse.json();

      if (!verifyIpData.allowed) {
        setError(verifyIpData.message || 'Verification failed. Please try again later.');
        setIsLoading(false);
        return;
      }

      // If email is valid, proceed with sending OTP
      const response = await sendEmailOTP(emailAddress);

      if (response.success) {
        setEmail(emailAddress);
        setCurrentStep('otp');
      } else {
        setError(response.message);
      }
    } catch (error) {
      console.error('Error in email submission:', error);
      setError('Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerify = async (otp: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await verifyEmailOTP(email, otp);
      
      if (response.success && response.user) {
        const user = response.user;
        console.log('✅ User verified:', user.id);
        
        try {
          // Now check if user has 2FA enabled
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('two_factor_enabled, password_hash, action_password_hash, action_password_settings')
            .eq('id', user.id)
            .maybeSingle();
          
          if (!profile) {
            console.log('Profile not found, creating new profile...');
            
            // Create new profile for the user
            const { error: createError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                phone_number: user.email || '',
                country_code: '+1',
                profile_completed: false,
                name: user.email?.split('@')[0] || 'User',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            
            if (createError) {
              console.error('Error creating profile:', createError);
              setError('Failed to create user profile. Please try again.');
              setIsLoading(false);
              return;
            }
            
            console.log('✅ Profile created successfully');
            setCurrentStep('success');
            
            // Create user session
            await createUserSession(user.id);
            
            setTimeout(() => {
              onAuthSuccess();
            }, 2000);
            return;
          }
          
          console.log('📋 Profile data:', { 
            two_factor_enabled: profile?.two_factor_enabled, 
            has_password: !!profile?.password_hash 
          });
          
          if (profile?.two_factor_enabled && profile?.password_hash) {
            console.log('🔐 2FA enabled, requesting password');
            setIsLoading(false);
            setCurrentStep('password');
          } else if (profile?.action_password_hash && profile?.action_password_settings?.login) {
            console.log('🛡️ Action Password enabled for login, requesting password');
            setIsLoading(false);
            setCurrentStep('action_password');
          } else {
            console.log('✅ No 2FA or Action Password, proceeding to success');
            setCurrentStep('success');
            
            // Create user session
            await createUserSession(user.id);
            
            setTimeout(() => {
              onAuthSuccess();
            }, 2000);
          }
        } catch (error) {
          console.error('Error checking 2FA status:', error);
          // If there's an error checking 2FA, proceed without it
          setCurrentStep('success');
          setTimeout(() => {
            onAuthSuccess();
          }, 2000);
        }
      } else {
        setError(response.message || 'Authentication failed. Please try again.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error in handleOTPVerify:', error);
      setError('Failed to verify code. Please try again.');
      setIsLoading(false);
    }
  };

  const handlePasswordVerify = async (password: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not found');
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('password_hash')
        .eq('id', user.id)
        .single();

      if (!profile?.password_hash) {
        setError('Two-factor authentication not properly configured');
        setIsLoading(false);
        return;
      }

      // Verify password (simple base64 comparison - in production use proper bcrypt)
      const passwordHash = btoa(password);
      if (passwordHash !== profile.password_hash) {
        setError('Incorrect password');
        setIsLoading(false);
        return;
      }

      // Password correct, check if action password is also required
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('action_password_hash, action_password_settings')
        .eq('id', user.id)
        .single();

      if (updatedProfile?.action_password_hash && updatedProfile?.action_password_settings?.login) {
        console.log('🛡️ Action Password enabled for login, requesting password after 2FA');
        setIsLoading(false);
        setCurrentStep('action_password');
        return;
      }

      // Password correct, proceed to success
      console.log('✅ 2FA password verified successfully');
      setCurrentStep('success');
      
      // Create user session
      await createUserSession(user.id);
      
      setTimeout(() => {
        onAuthSuccess();
      }, 2000);
    } catch (error) {
      console.error('Error verifying 2FA password:', error);
      setError('Failed to verify password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 'email') {
      navigate('/intro');
    } else if (currentStep === 'otp') {
      setCurrentStep('email');
      setError('');
    } else if (currentStep === 'password') {
      setCurrentStep('otp');
      setError('');
    }
  };

  const handleResendOTP = async () => {
    if (email) {
      setIsLoading(true);
      setError('');

      try {
        // Validate email again before resending
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Supabase configuration missing');
        }

        const validationUrl = `${supabaseUrl}/functions/v1/validate-email`;

        const validationResponse = await fetch(validationUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify({ email }),
        });

        const validationData = await validationResponse.json();

        if (!validationData.valid) {
          setError(validationData.message || 'This email address is not allowed.');
          setIsLoading(false);
          return;
        }

        // If valid, resend OTP
        const response = await sendEmailOTP(email);

        if (!response.success) {
          setError(response.message);
        }
      } catch (error) {
        setError('Failed to resend verification code. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900"></div>
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-600 to-slate-700 transform -rotate-12 scale-150"></div>
      </div>

      {/* Header */}
      {currentStep !== 'success' && (
        <div className="relative z-10 flex items-center justify-between p-4 sm:p-6">
          <button
            onClick={handleBack}
            className="p-2 rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white transition-all duration-300 backdrop-blur-sm"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-300 to-slate-100 bg-clip-text text-transparent">
            FRACT
          </div>
          
          <div className="w-8 h-8 sm:w-10 sm:h-10"></div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="relative z-10 mx-4 sm:mx-6 mb-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 backdrop-blur-sm">
            <p className="text-red-400 text-center">
              {error.includes('Check available countries') ? (
                <>
                  {error.split('Check available countries')[0]}
                  <button
                    onClick={() => navigate('/availablecountries')}
                    className="text-red-400 underline hover:text-red-300 font-medium transition-colors"
                  >
                    Check available countries
                  </button>
                  {error.split('Check available countries')[1]}
                </>
              ) : (
                error
              )}
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6">
        {currentStep === 'email' && (
          <EmailInput
            onSubmit={handleEmailSubmit}
            isLoading={isLoading}
            onNavigateToTOS={() => navigate('/tos')}
            onNavigateToPP={() => navigate('/pp')}
          />
        )}
        
        {currentStep === 'otp' && (
          <OTPVerification 
            email={email} 
            onVerify={handleOTPVerify}
            onBack={handleBack}
            onResend={handleResendOTP}
            isLoading={isLoading}
          />
        )}
        
        {currentStep === 'password' && (
          <PasswordVerification 
            onVerify={handlePasswordVerify}
            onBack={handleBack}
            isLoading={isLoading}
          />
        )}
        
        {currentStep === 'action_password' && (
          <ActionPassword
            onVerify={async (password) => {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) await createUserSession(user.id);
              setCurrentStep('success');
              setTimeout(() => {
                onAuthSuccess();
              }, 2000);
            }}
            onCancel={() => {
              supabase.auth.signOut();
              setCurrentStep('email');
            }}
            title="Action Password Required"
            description="Your account is protected by an action password for login."
          />
        )}

        {currentStep === 'success' && (
          <SuccessScreen />
        )}
      </div>
    </div>
  );
};

export default EmailAuth;