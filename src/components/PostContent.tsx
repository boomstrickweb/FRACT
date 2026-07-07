import React, { useState } from 'react';
import { parseTextWithUrls, getDisplayUrl, isShortUrl } from '../utils/urlUtils';
import ExternalLinkWarning from './ExternalLinkWarning';
import { ExternalLink } from 'lucide-react';

interface PostContentProps {
  text: string;
  className?: string;
}

const PostContent: React.FC<PostContentProps> = ({ text, className }) => {
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const segments = parseTextWithUrls(text);
  const hasUrls = segments.some(s => s.type === 'url');

  if (!hasUrls) {
    return <span className={className}>{text}</span>;
  }

  const handleLinkClick = (url: string, e: React.MouseEvent) => {
    e.preventDefault();
    setPendingUrl(url);
  };

  const handleConfirm = () => {
    if (pendingUrl) {
      window.open(pendingUrl, '_blank', 'noopener,noreferrer');
    }
    setPendingUrl(null);
  };

  return (
    <>
      <span className={className}>
        {segments.map((seg, i) => {
          if (seg.type === 'text') {
            return <span key={i}>{seg.value}</span>;
          }

          const display = getDisplayUrl(seg.value);
          const shortened = isShortUrl(seg.value);

          return (
            <button
              key={i}
              onClick={(e) => handleLinkClick(seg.value, e)}
              className={`inline-flex items-center gap-1 rounded px-0.5 text-left break-all transition-colors ${
                shortened
                  ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                  : 'text-sky-400 hover:text-sky-300 hover:bg-sky-500/10'
              }`}
              title={seg.value}
            >
              <ExternalLink className="w-3 h-3 flex-shrink-0 inline" />
              <span className="underline underline-offset-2">{display}</span>
            </button>
          );
        })}
      </span>

      {pendingUrl && (
        <ExternalLinkWarning
          url={pendingUrl}
          onConfirm={handleConfirm}
          onCancel={() => setPendingUrl(null)}
        />
      )}
    </>
  );
};

export default PostContent;
