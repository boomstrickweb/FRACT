const CACHE_KEY = 'fract_geo_check';
const CACHE_DURATION = 24 * 60 * 60 * 1000;

interface GeoCheckResult {
  allowed: boolean;
  country: string;
  timestamp: number;
}

export const checkGeolocation = async (): Promise<{
  allowed: boolean;
  country: string;
}> => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed: GeoCheckResult = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_DURATION) {
        return { allowed: parsed.allowed, country: parsed.country };
      }
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-geolocation`;
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    const countryCode = data.country || '';
    const allowed = data.allowed !== false;

    const result: GeoCheckResult = {
      allowed,
      country: countryCode,
      timestamp: Date.now(),
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(result));

    return { allowed, country: countryCode };
  } catch (error) {
    console.error('Geolocation check error:', error);
    return { allowed: true, country: '' };
  }
};

export const getBlockMessage = (): string => {
  return 'FRACT is currently available only in the United States and Germany. We\'re expanding gradually.';
};
