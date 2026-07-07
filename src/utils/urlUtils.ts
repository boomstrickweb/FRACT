const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

export interface ParsedSegment {
  type: 'text' | 'url';
  value: string;
}

export function parseTextWithUrls(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'url', value: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

export function isShortUrl(url: string): boolean {
  const shorteners = [
    'bit.ly', 't.co', 'tinyurl.com', 'goo.gl', 'ow.ly', 'buff.ly',
    'short.link', 'tiny.cc', 'is.gd', 'rb.gy', 'cutt.ly', 'v.gd',
    'shorturl.at', 'shorte.st', 'clck.ru', 'lnkd.in', 'amzn.to',
    'youtu.be', 'fb.me', 'wp.me', 'dlvr.it', 'ift.tt'
  ];
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return shorteners.includes(hostname);
  } catch {
    return false;
  }
}

export function getDisplayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    const query = parsed.search ? '...' : '';
    const display = `${hostname}${path}${query}`;
    return display.length > 60 ? display.slice(0, 57) + '...' : display;
  } catch {
    return url.length > 60 ? url.slice(0, 57) + '...' : url;
  }
}
