import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ExternalLink, X, Link2 } from 'lucide-react';
import { isShortUrl } from '../utils/urlUtils';

interface ExternalLinkWarningProps {
  url: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ExternalLinkWarning: React.FC<ExternalLinkWarningProps> = ({ url, onConfirm, onCancel }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const shortened = isShortUrl(url);

  let hostname = url;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    hostname = url;
  }

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6" style={{ zIndex: 9999 }}>
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onCancel}
      />
      
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-amber-600/20 border-b border-amber-500/30 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-white font-bold text-lg">External Link Warning</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-5 overflow-y-auto min-h-0 flex-1">
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            You are about to leave this platform and visit an external website. This site has no control over external content.
          </p>

          <div className="bg-slate-900/60 border border-slate-600/50 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center space-x-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
              <Link2 className="w-4 h-4" />
              <span>Destination</span>
            </div>
            <div className="text-slate-200 text-sm font-mono break-all leading-relaxed bg-black/30 p-3 rounded-xl border border-slate-700/50">
              {url}
            </div>
            <div className="text-slate-400 text-xs flex items-center space-x-2">
              <span>Domain:</span>
              <span className="text-amber-400/90 font-semibold px-2 py-0.5 bg-amber-400/10 rounded-md">{hostname}</span>
            </div>
          </div>

          {shortened && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 text-sm font-bold">Shortened URL</p>
                <p className="text-red-400/80 text-xs mt-1 leading-normal">
                  This is a shortened URL. The final destination may differ from what is displayed above. Exercise caution.
                </p>
              </div>
            </div>
          )}

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
            <p className="text-slate-500 text-xs leading-relaxed">
              Verify the destination looks legitimate before proceeding. Do not enter credentials on sites you do not trust.
            </p>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:pb-8 border-t border-slate-700/50 bg-slate-800/50 flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 flex-shrink-0">
          <button
            onClick={onCancel}
            className="w-full sm:flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-bold text-sm sm:text-base transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="w-full sm:flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm sm:text-base transition-all active:scale-95 shadow-lg shadow-amber-900/20"
          >
            <ExternalLink className="w-5 h-5" />
            <span>Visit Site</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ExternalLinkWarning;
