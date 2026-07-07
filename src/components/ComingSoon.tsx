import React from 'react';
import { Globe } from 'lucide-react';

const ComingSoon: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-cyan-600/20 to-teal-600/20 border border-cyan-500/20 rounded-full flex items-center justify-center shadow-2xl">
          <Globe className="w-12 h-12 text-cyan-400" />
        </div>

        <h1 className="text-4xl font-bold text-slate-100 mb-4">Coming Soon</h1>

        <p className="text-lg text-slate-300 mb-8 leading-relaxed">
          FRACT is currently available only in the United States and Germany. We're expanding gradually.
        </p>

        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
          <p className="text-sm text-slate-400">
            We appreciate your interest! Check back soon for availability in your region.
          </p>
        </div>

        <div className="mt-8 flex justify-center space-x-3">
          <div className="w-2 h-2 rounded-full bg-cyan-500/40 animate-pulse"></div>
          <div className="w-2 h-2 rounded-full bg-cyan-500/60 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 rounded-full bg-cyan-500/40 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
