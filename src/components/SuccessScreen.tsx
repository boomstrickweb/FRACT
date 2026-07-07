import React, { useEffect, useState } from 'react';
import { CheckCircle, Sparkles } from 'lucide-react';

const SuccessScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto text-center px-4">
      {/* Success Animation */}
      <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="relative mb-6 sm:mb-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </div>
          
          {/* Sparkles animation */}
          <div className="absolute inset-0 pointer-events-none">
            <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-400 absolute top-2 right-4 sm:top-4 sm:right-8 animate-bounce delay-100" />
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400 absolute top-8 left-8 sm:top-12 sm:left-12 animate-bounce delay-300" />
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 absolute bottom-4 right-2 sm:bottom-8 sm:right-4 animate-bounce delay-500" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-4">
          Successfully registered!
        </h2>
        
        <p className="text-slate-400 text-base sm:text-lg mb-6 sm:mb-8">
          Welcome to FRACT. Your journey begins now.
        </p>

        {/* Animated welcome message */}
        <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-700">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-300 to-slate-100 bg-clip-text text-transparent">
              FRACT
            </div>
            <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></div>
          </div>
          
          <p className="text-slate-300 text-xs sm:text-sm">
            No likes. No noise. Just authentic connections.
          </p>
        </div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-slate-500 rounded-full animate-ping delay-1000 hidden sm:block"></div>
        <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-slate-400 rounded-full animate-ping delay-1500 hidden sm:block"></div>
        <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-slate-600 rounded-full animate-ping delay-2000 hidden sm:block"></div>
      </div>
    </div>
  );
};

export default SuccessScreen;