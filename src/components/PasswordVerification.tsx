import React, { useState, useRef, useEffect } from 'react';
import { Lock, ArrowLeft } from 'lucide-react';

interface PasswordVerificationProps {
  onVerify: (password: string) => void;
  onBack: () => void;
  isLoading?: boolean;
}

const PasswordVerification: React.FC<PasswordVerificationProps> = ({ 
  onVerify, 
  onBack,
  isLoading = false 
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onVerify(password);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && password.trim()) {
      onVerify(password);
    }
  };

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
          <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-slate-100" />
        </div>
        
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
          Two-Factor Authentication
        </h2>
        
        <p className="text-slate-400 text-base sm:text-lg px-4">
          Enter your 2FA password to complete sign in
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <div className="relative">
            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your 2FA password"
              disabled={isLoading}
              className="w-full p-3 sm:p-4 bg-slate-800/50 border border-slate-700 rounded-xl sm:rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm text-base sm:text-lg pr-12"
              maxLength={32}
            />
            
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors duration-300"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={!password.trim() || isLoading}
          className="w-full p-3 sm:p-4 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 disabled:from-slate-700 disabled:to-slate-800 disabled:opacity-50 text-white font-semibold rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:transform-none disabled:cursor-not-allowed text-sm sm:text-base"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Verifying...</span>
            </div>
          ) : (
            'Verify Password'
          )}
        </button>
      </form>

      <div className="mt-8 text-center">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="flex items-center justify-center space-x-2 text-slate-400 hover:text-slate-200 transition-colors duration-300 disabled:opacity-50 text-sm sm:text-base mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to verification code</span>
        </button>
      </div>
    </div>
  );
};

export default PasswordVerification;