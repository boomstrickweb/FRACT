import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

interface IntroPageProps {
  onGetStarted: () => void;
}

const IntroPage: React.FC<IntroPageProps> = ({ onGetStarted }) => {
  const [isAnimated, setIsAnimated] = useState(false);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimated(true);
      setTimeout(() => setShowText(true), 800);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 relative overflow-hidden">
      {/* Background subtle pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-600 to-slate-700 transform rotate-12 scale-150"></div>
      </div>

      {/* Animated Logo */}
      <div className="relative mb-8 sm:mb-12 lg:mb-16 flex items-center justify-center">
        <div className="relative">
          {/* Broken Circle Animation */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 mb-6 sm:mb-8">
            <svg
              className="w-full h-full transform transition-all duration-1000 ease-out"
              viewBox="0 0 128 128"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* First arc */}
              <path
                d="M64 8 A56 56 0 0 1 108.5 35.5"
                stroke="url(#gradient1)"
                strokeWidth="4"
                strokeLinecap="round"
                className={`transition-all duration-1000 ease-out ${
                  isAnimated ? 'transform rotate-12' : ''
                }`}
                style={{
                  transformOrigin: '64px 64px',
                  strokeDasharray: '100',
                  strokeDashoffset: isAnimated ? '0' : '100',
                }}
              />
              
              {/* Second arc */}
              <path
                d="M108.5 92.5 A56 56 0 0 1 64 120"
                stroke="url(#gradient2)"
                strokeWidth="4"
                strokeLinecap="round"
                className={`transition-all duration-1000 ease-out delay-200 ${
                  isAnimated ? 'transform -rotate-12' : ''
                }`}
                style={{
                  transformOrigin: '64px 64px',
                  strokeDasharray: '100',
                  strokeDashoffset: isAnimated ? '0' : '100',
                }}
              />
              
              {/* Third arc */}
              <path
                d="M64 120 A56 56 0 0 1 19.5 92.5"
                stroke="url(#gradient3)"
                strokeWidth="4"
                strokeLinecap="round"
                className={`transition-all duration-1000 ease-out delay-400 ${
                  isAnimated ? 'transform rotate-6' : ''
                }`}
                style={{
                  transformOrigin: '64px 64px',
                  strokeDasharray: '100',
                  strokeDashoffset: isAnimated ? '0' : '100',
                }}
              />
              
              {/* Fourth arc */}
              <path
                d="M19.5 35.5 A56 56 0 0 1 64 8"
                stroke="url(#gradient4)"
                strokeWidth="4"
                strokeLinecap="round"
                className={`transition-all duration-1000 ease-out delay-600 ${
                  isAnimated ? 'transform -rotate-6' : ''
                }`}
                style={{
                  transformOrigin: '64px 64px',
                  strokeDasharray: '100',
                  strokeDashoffset: isAnimated ? '0' : '100',
                }}
              />
              
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>
                <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#334155" />
                </linearGradient>
                <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#64748b" />
                </linearGradient>
                <linearGradient id="gradient4" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* FRACT Text */}
          <div className="text-center">
            <h1 
              className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-slate-300 via-slate-100 to-slate-300 bg-clip-text text-transparent transition-all duration-1000 ${
                showText ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'
              }`}
              style={{ 
                fontFamily: 'system-ui, -apple-system, sans-serif',
                letterSpacing: '0.1em',
                textShadow: '0 0 30px rgba(148, 163, 184, 0.3)'
              }}
            >
              FRACT
            </h1>
          </div>
        </div>
      </div>

      {/* Tagline */}
      <div className={`text-center mb-8 sm:mb-12 lg:mb-16 transition-all duration-1000 delay-1000 ${
        showText ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'
      }`}>
        <p className="text-lg sm:text-xl lg:text-2xl text-slate-300 font-light leading-relaxed px-4">
          No likes. No noise. Just FRACT.
        </p>
      </div>

      {/* Get Started Button */}
      <div className={`flex flex-col items-center space-y-6 transition-all duration-1000 delay-1200 ${
        showText ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'
      }`}>
        <button
          onClick={onGetStarted}
          className="group relative px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-semibold rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
        >
          <div className="flex items-center space-x-2">
            <span className="text-base sm:text-lg">Get Started</span>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
          
          {/* Glowing effect */}
          <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-slate-600 to-slate-700 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"></div>
        </button>

        <button
          onClick={() => window.location.hash = '#/availablecountries'}
          className="text-slate-400 hover:text-slate-200 text-sm transition-colors flex items-center gap-2"
        >
          Check available countries
        </button>
      </div>

      {/* Floating elements */}
      <div className="absolute top-16 sm:top-20 left-6 sm:left-10 w-2 h-2 bg-slate-500 rounded-full opacity-60 animate-pulse"></div>
      <div className="absolute bottom-24 sm:bottom-32 right-8 sm:right-16 w-3 h-3 bg-slate-400 rounded-full opacity-40 animate-pulse delay-1000"></div>
      <div className="absolute top-1/3 right-4 sm:right-8 w-1 h-1 bg-slate-600 rounded-full opacity-80 animate-pulse delay-500"></div>
    </div>
  );
};

export default IntroPage;