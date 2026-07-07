import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HiveResponse {
  status?: Array<{
    code: number;
    message: string;
    response?: {
      output?: Array<{
        classes?: Array<{
          class: string;
          score?: number;
          value?: number;
        }>;
      }>;
    };
  }>;
  output?: Array<{
    choices?: Array<{
      classes?: Array<{
        class: string;
        score?: number;
        value?: number;
      }>;
    }>;
    classes?: Array<{
      class: string;
      score?: number;
      value?: number;
    }>;
  }>;
}

const HIVE_API_KEY = "YOUR_HIVE_KEY";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { text, userId } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const HIVE_API_KEY_ENV = Deno.env.get("HIVE_API_KEY");
    const apiKey = HIVE_API_KEY_ENV || HIVE_API_KEY;

    const hiveResponse = await fetch("https://api.thehive.ai/api/v3/hive/text-moderation", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: [{ text }]
      }),
    });

    if (!hiveResponse.ok) {
      const errorText = await hiveResponse.text();
      console.error("Hive API error:", hiveResponse.status, errorText);
      return new Response(JSON.stringify({ 
        error: "Moderation service error", 
        status: hiveResponse.status,
        details: errorText 
      }), {
        status: 200, // Return 200 so the client can handle the "error" gracefully if needed
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data: HiveResponse = await hiveResponse.json();
    console.log("Hive API response data:", JSON.stringify(data));

    let classes: Array<{ class: string; score?: number; value?: number }> = [];

    // Try to find classes in various possible response structures
    if (data.output && data.output[0]) {
      if (data.output[0].choices && data.output[0].choices[0] && data.output[0].choices[0].classes) {
        classes = data.output[0].choices[0].classes;
      } else if (data.output[0].classes) {
        classes = data.output[0].classes;
      }
    } else if (data.status && data.status[0] && data.status[0].response && data.status[0].response.output && data.status[0].response.output[0] && data.status[0].response.output[0].classes) {
      classes = data.status[0].response.output[0].classes;
    }

    if (classes.length === 0) {
      console.error("Unexpected Hive API response structure:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Invalid response from moderation service", raw: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Define categories
    const criticalCategories = ["child_exploitation", "child_safety", "self_harm_intent"];
    const standardCategories = ["bullying", "violent_description", "drugs", "self_harm", "hate", "violence", "weapons"];

    let action: 'allow' | 'user_only' | 'remove_discover' | 'ban_and_label' | 'quarantine' = 'allow';
    let triggeredCategory = 'NONE';
    let maxScore = 0;

    for (const cls of classes) {
      if (cls.class === 'spam') continue; // Explicitly ignore spam category
      // Hive scores can be in 'score' (float 0-1) or 'value' (integer 0-3)
      const rawScore = cls.value !== undefined ? cls.value : (cls.score !== undefined ? cls.score : 0);
      
      let score = 0;
      if (Number.isInteger(rawScore)) {
        // Integer format (0-3)
        score = rawScore;
      } else {
        // Float format (0-1)
        if (rawScore >= 0.9) score = 3;
        else if (rawScore >= 0.7) score = 2;
        else if (rawScore >= 0.5) score = 1;
      }
      
      if (criticalCategories.includes(cls.class) && (score >= 1 || rawScore >= 0.5)) {
        action = 'user_only';
        triggeredCategory = cls.class;
        maxScore = score || 3;
        break; // Critical takes precedence
      }

      if (standardCategories.includes(cls.class) && score >= 1) {
        // Update action if the current score is higher than what we've seen so far
        if (score >= 3) {
          action = 'quarantine';
          triggeredCategory = cls.class;
          maxScore = 3;
          // We found High, we can stop or continue for even higher (if possible, though 3 is max)
        } else if (score === 2 && action !== 'quarantine') {
          action = 'ban_and_label';
          triggeredCategory = cls.class;
          maxScore = 2;
        } else if (score === 1 && action === 'allow') {
          action = 'remove_discover';
          triggeredCategory = cls.class;
          maxScore = 1;
        }
      }
    }

    return new Response(JSON.stringify({ 
      action, 
      category: triggeredCategory, 
      score: maxScore 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Worker error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
