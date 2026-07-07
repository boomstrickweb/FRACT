import React, { useState, useRef, useEffect } from 'react';
import { Mail, RotateCcw, MessageSquare } from 'lucide-react';

interface OTPVerificationProps {
  email?: string;
  phoneNumber?: string;
  onVerify: (otp: string) => void;
  onBack: () => void;
  onResend: () => void;
  isLoading?: boolean;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({ 
  email,
  phoneNumber,
  onVerify, 
  onBack, 
  onResend,
  isLoading = false 
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every(digit => digit !== '')) {
      onVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    setCountdown(60);
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    onResend();
  };

  const displayContact = email || phoneNumber || '';
  const contactType = email ? 'email' : 'phone number';
  const icon = email ? Mail : MessageSquare;
  const IconComponent = icon;

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
          <IconComponent className="w-8 h-8 sm:w-10 sm:h-10 text-slate-100" />
        </div>
        
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
          Verify your {contactType}
        </h2>
        
        <p className="text-slate-400 text-base sm:text-lg mb-2 px-4">
          We've sent a 6-digit code to
        </p>
        
        <p className="text-slate-200 font-semibold text-base sm:text-lg px-4 break-all">
          {displayContact}
        </p>
      </div>

      <div className="space-y-6">
        {/* OTP Input */}
        <div className="flex justify-center space-x-2 sm:space-x-3 px-4">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isLoading}
              className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold bg-slate-800/50 border border-slate-700 rounded-xl sm:rounded-2xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm disabled:opacity-50"
            />
          ))}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center space-x-2 text-slate-400 text-sm sm:text-base">
            <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Verifying code...</span>
          </div>
        )}

        {/* Resend code */}
        <div className="text-center">
          {countdown > 0 ? (
            <p className="text-slate-500 text-sm sm:text-base">
              Resend code in <span className="text-slate-300 font-semibold">{countdown}s</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={isLoading}
              className="flex items-center justify-center space-x-2 text-slate-300 hover:text-slate-100 transition-colors duration-300 mx-auto disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Resend code</span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="text-slate-400 hover:text-slate-200 transition-colors duration-300 disabled:opacity-50 text-sm sm:text-base"
        >
          Wrong email? Go back
        </button>
      </div>
    </div>
  );
};

export default OTPVerification;