import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_COUNTRIES = ["US", "DE"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    let countryCode = req.headers.get("cf-ipcountry") || "";

    if (!countryCode) {
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
                       req.headers.get("x-real-ip") ||
                       "";

      if (clientIp) {
        const geoResponse = await fetch(`https://ipapi.co/${clientIp}/json/`);
        const geoData = await geoResponse.json();
        countryCode = geoData.country_code || "";
      }
    }

    const isAllowed = ALLOWED_COUNTRIES.includes(countryCode.toUpperCase());

    return new Response(
      JSON.stringify({
        allowed: isAllowed,
        country: countryCode,
        message: isAllowed
          ? "Access granted"
          : "FRACT is currently available only in the United States and Germany. We're expanding gradually.",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Geolocation check error:", error);
    return new Response(
      JSON.stringify({
        allowed: false,
        message: "Unable to verify location. Please try again later.",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
