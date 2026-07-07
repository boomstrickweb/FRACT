import React, { useState } from 'react';
import { Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ActionPasswordProps {
  onVerify: (password: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

const ActionPassword: React.FC<ActionPasswordProps> = ({ 
  onVerify, 
  onCancel, 
  title = "Action Password Required",
  description = "Please enter your action password to continue."
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!password) {
      setError('Password is required');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-action-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          action: 'verify',
          password
        })
      });

      const result = await response.json();

      if (result.isValid) {
        onVerify(password);
      } else {
        setError(result.error || 'Incorrect password');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-6 bg-indigo-600/20 rounded-2xl flex items-center justify-center">
            <Lock className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">{title}</h2>
          <p className="text-slate-400">{description}</p>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              placeholder="Enter action password"
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-4 text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-12"
              autoFocus
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Lock className="w-5 h-5 text-slate-500" />
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col space-y-3">
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center space-x-2"
            >
              {isVerifying ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <button
              onClick={onCancel}
              disabled={isVerifying}
              className="w-full py-3 text-slate-400 hover:text-slate-200 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionPassword;
