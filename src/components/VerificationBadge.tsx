import React, { useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface VerificationBadgeProps {
  isVerified: boolean;
  verificationType?: string | null;
  verificationReason?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  isVerified,
  verificationType = 'fract_user',
  verificationReason,
  size = 'md',
  className = ''
}) => {
  const [showModal, setShowModal] = useState(false);

  // Only show badge if explicitly verified
  if (!isVerified) return null;

  const displayVerificationType = verificationType || 'fract_user';

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const getVerificationTitle = (type: string) => {
    switch (type) {
      case 'fract_user':
        return 'Verified FRACT User';
      case 'developer':
        return 'Verified Developer';
      case 'organization':
        return 'Verified Organization';
      default:
        return 'Verified Account';
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center justify-center text-slate-500 hover:text-slate-400 transition-colors duration-200 ${className}`}
        title="Verified account"
      >
        <CheckCircle className={`${sizeClasses[size]} text-slate-500 hover:text-slate-400 transition-colors duration-200`} />
      </button>

      {/* Verification Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-3xl p-6 max-w-sm w-full border border-slate-700 relative">
            {/* Close button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-all duration-300"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              {/* Verification icon */}
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-500 to-slate-600 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-slate-100 mb-2">
                {getVerificationTitle(displayVerificationType)}
              </h3>

              {/* Description */}
              {verificationReason ? (
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  {verificationReason}
                </p>
              ) : (
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  This account has been verified by FRACT.
                </p>
              )}

              {/* Verification type badge */}
              <div className="inline-flex items-center px-3 py-1 bg-slate-600/30 rounded-full border border-slate-600/50">
                <CheckCircle className="w-4 h-4 text-slate-400 mr-2" />
                <span className="text-slate-300 text-xs font-medium uppercase tracking-wide">
                  {displayVerificationType.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VerificationBadge;