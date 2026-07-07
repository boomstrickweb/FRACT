import { createClient } from 'npm:@supabase/supabase-js@2.43.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Netherlands', 'Germany', 'Ireland', 'Denmark','Norway', 'Finland', 'Sweden', 'Australia', 'New Zealand', 'Switzerland', 'Estonia', 'Japan', 'Iceland'];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, ip } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({
          allowed: false,
          message: 'Email is required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Check if user already exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone_number', email)
      .maybeSingle();

    if (profile) {
      // User exists, bypass IP checks
      return new Response(
        JSON.stringify({
          allowed: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Get user IP
    const clientIp = ip || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip');

    if (!clientIp) {
      return new Response(
        JSON.stringify({
          allowed: false,
          message: 'Could not determine IP address',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Fetch data from ip-api.com
    // We request specific fields: status, message, country, isp, proxy, hosting
    const fields = 'status,message,country,isp,proxy,hosting';
    const ipApiResponse = await fetch(`http://ip-api.com/json/${clientIp}?fields=${fields}`);
    const ipData = await ipApiResponse.json();

    if (ipData.status !== 'success') {
      console.error('IP-API error:', ipData.message);
      // If the API fails, we might want to allow or disallow. 
      // But let's assume it works for now or handle as failure.
      return new Response(
        JSON.stringify({
          allowed: false,
          message: 'Unable to verify your location. Please try again later.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Anti-VPN/Proxy logic
    // ISP as M247, or proxy and hosting as true
    // "Even if only one of the three parameters meets the criteria, don’t let it through!"
    const isM247 = ipData.isp && ipData.isp.includes('M247');
    const isProxy = ipData.proxy === true;
    const isHosting = ipData.hosting === true;

    if (isM247 || isProxy || isHosting) {
      return new Response(
        JSON.stringify({
          allowed: false,
          message: 'Proxy/VPN detected. We cannot send the verification code.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 5. Country restriction
    if (!ALLOWED_COUNTRIES.includes(ipData.country)) {
      return new Response(
        JSON.stringify({
          allowed: false,
          message: 'FRACT is currently not available in your country. Check available countries.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // All checks passed
    return new Response(
      JSON.stringify({
        allowed: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in verify-ip function:', error);
    return new Response(
      JSON.stringify({
        allowed: false,
        message: 'An unexpected error occurred during verification.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
