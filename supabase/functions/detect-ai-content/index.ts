import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DetectionRequest {
  content: string;
  postId: string;
  postTable: "posts" | "post_series";
}

async function checkWithApi(content: string): Promise<number | null> {
  try {
    const apiKey = "YOUR_API_KEY";
    const response = await fetch(
      "https://www.wasitaigenerated.com/api/v1/detect/text",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      }
    );

    const rawText = await response.text();
    console.log("API status:", response.status);
    console.log("API raw response:", rawText);

    if (!response.ok) {
      console.error("API error - status:", response.status, "body:", rawText);
      return null;
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("Failed to parse API response as JSON:", rawText);
      return null;
    }

    console.log("Parsed data:", JSON.stringify(data));

    if (data?.success === false) {
      console.error("API returned success: false", JSON.stringify(data));
      return null;
    }

    const isAI = data?.isAI as boolean | undefined;
    const confidence = (data?.confidence as number) ?? null;
    if (confidence === null || isAI === undefined) return null;

    const aiScore = isAI ? Math.round(confidence * 100) : Math.round((1 - confidence) * 100);
    console.log("isAI:", isAI, "Confidence:", confidence, "Final AI score:", aiScore);
    return aiScore;
  } catch (error) {
    console.error("API call exception:", error);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body: DetectionRequest = await req.json();
    const { content, postId, postTable } = body;

    if (!content || !postId || !postTable) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (content.length < 30) {
      return new Response(
        JSON.stringify({ result: "skipped", reason: "content_too_short" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiScore = await checkWithApi(content);
    const threshold = 75;

    if (aiScore === null) {
      return new Response(
        JSON.stringify({ result: "skipped", reason: "api_unavailable" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiDetected = aiScore >= threshold;

    if (aiDetected) {
      const flagType = aiScore >= 85 ? "ai_generated" : "ai_assisted";

      const { error: updateError } = await supabase
        .from(postTable)
        .update({
          ai_flagged: true,
          ai_detection_type: flagType,
          ai_flag_source: "system",
          ai_detection_score: aiScore,
        })
        .eq("id", postId);

      if (updateError) {
        console.error("Failed to update post:", updateError);
      }

      return new Response(
        JSON.stringify({
          result: "flagged",
          flagType,
          score: aiScore,
          threshold,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { error: updateError } = await supabase
      .from(postTable)
      .update({
        ai_detection_score: aiScore,
      })
      .eq("id", postId);

    if (updateError) {
      console.error("Failed to save score:", updateError);
    }

    return new Response(
      JSON.stringify({
        result: "clean",
        score: aiScore,
        threshold,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Detection error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
