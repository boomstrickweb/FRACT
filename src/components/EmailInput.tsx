import React, { useState } from 'react';
import { Mail } from 'lucide-react';

interface EmailInputProps {
  onSubmit: (email: string) => void;
  isLoading?: boolean;
  onNavigateToTOS: () => void;
  onNavigateToPP: () => void;
}

const EmailInput: React.FC<EmailInputProps> = ({ onSubmit, isLoading = false, onNavigateToTOS, onNavigateToPP }) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    if (value && !validateEmail(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    onSubmit(email.trim().toLowerCase());
  };

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
          <Mail className="w-8 h-8 sm:w-10 sm:h-10 text-slate-100" />
        </div>
        
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
          Enter your email
        </h2>
        
        <p className="text-slate-400 text-base sm:text-lg px-4">
          We'll send you a verification code to confirm your email
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <input
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="your.email@example.com"
            className={`w-full p-3 sm:p-4 bg-slate-800/50 border rounded-xl sm:rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm text-base sm:text-lg ${
              emailError 
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-slate-700 focus:ring-slate-500'
            }`}
            required
            disabled={isLoading}
          />
          
          {emailError && (
            <p className="text-red-400 text-xs sm:text-sm mt-2">{emailError}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!email.trim() || !!emailError || isLoading}
          className="w-full p-3 sm:p-4 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 disabled:from-slate-700 disabled:to-slate-800 disabled:opacity-50 text-white font-semibold rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:transform-none disabled:cursor-not-allowed text-sm sm:text-base"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Sending code...</span>
            </div>
          ) : (
            'Send verification code'
          )}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-slate-500 text-xs sm:text-sm px-4">
          By continuing, you agree to our{' '}
          <button
            onClick={onNavigateToTOS}
            className="text-slate-300 hover:text-slate-100 underline transition-colors duration-200"
          >
            Terms of Service
          </button>
          {' '}and{' '}
          <button
            onClick={onNavigateToPP}
            className="text-slate-300 hover:text-slate-100 underline transition-colors duration-200"
          >
            Privacy Policy
          </button>
        </p>
      </div>
    </div>
  );
};

export default EmailInput;