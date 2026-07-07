import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ClassificationItem {
  content: string;
  postId: string;
}

interface ClassificationRequest {
  content?: string;
  postId?: string;
  items?: ClassificationItem[];
  postTable: "posts" | "post_series";
}

const CATEGORIES = [
  "💻 Technology, Software & Digital Culture",
  "🔭 Science & Exploration",
  "🧠 Psychology, Philosophy & Human Mind",
  "🎨 Arts, Design & Creativity",
  "📈 Economy, Business & Strategy",
  "⚖️ Politics & Governance",
  "🌍 Society & Everyday Life",
  "🎬 Entertainment & Pop Culture",
  "🌱 Health & Wellbeing",
  "🌐 World Affairs"
];

const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";

async function classifyBatch(items: ClassificationItem[]) {
  try {
    const prompt = `
      Classify each of the following ${items.length} texts into one or more of these categories:
      ${CATEGORIES.join("\n")}

      Rules:
      1. You must only pick from the provided list.
      2. Return the result as a valid JSON array of objects, one for each input text in the exact same order.
      3. Each object in the array should have:
         - 'postId': The ID provided for the text.
         - 'labels': An array of strings from the category list.
         - 'scores': An array of confidence values (0-1) matching the order of labels.
      4. If multiple categories apply, list them in order of relevance.
      
      Texts to classify:
      ${items.map((item, index) => `[${index}] ID: ${item.postId}\nText: "${item.content}"`).join("\n\n")}

      Response format example:
      [
        {
          "postId": "some-uuid",
          "labels": ["💻 Technology, Software & Digital Culture"],
          "scores": [0.95]
        },
        ...
      ]
    `;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json",
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();

    if (response.status === 429) {
      console.error("Gemini Quota Exceeded:", data);
      return { error: "QUOTA_EXCEEDED" };
    }

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
      console.error("Gemini returned empty response");
      return null;
    }

    try {
      const parsed = JSON.parse(resultText);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", resultText);
      return null;
    }
  } catch (error) {
    console.error("Classification API call exception:", error);
    return null;
  }
}

async function classifyContent(content: string) {
  try {
    const prompt = `
      Classify the following text into one or more of these categories:
      ${CATEGORIES.join("\n")}

      Rules:
      1. You must only pick from the provided list.
      2. Return the result as a valid JSON object.
      3. The JSON should have a 'labels' array (strings from the list) and a 'scores' array (confidence values between 0 and 1, matching the order of labels).
      4. If multiple categories apply, list them in order of relevance.
      
      Text to classify:
      "${content}"

      Response format example:
      {
        "labels": ["💻 Technology, Software & Digital Culture", "📈 Economy, Business & Strategy"],
        "scores": [0.95, 0.45]
      }
    `;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json",
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();

    if (response.status === 429) {
      console.error("Gemini Quota Exceeded:", data);
      return { error: "QUOTA_EXCEEDED", message: "Classification quota exceeded. Please try again later." };
    }

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
      console.error("Gemini returned empty response");
      return null;
    }

    try {
      const parsed = JSON.parse(resultText);
      return parsed;
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", resultText);
      return null;
    }
  } catch (error) {
    console.error("Classification API call exception:", error);
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

    const body: ClassificationRequest = await req.json();
    const { content, postId, items, postTable } = body;

    if (!postTable || (!items && (!content || !postId))) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (items && items.length > 0) {
      console.log(`Classifying batch of ${items.length} items for ${postTable}`);
      const batchResult = await classifyBatch(items);

      if (!batchResult) {
        return new Response(
          JSON.stringify({ error: "Batch classification failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if ('error' in batchResult && batchResult.error === 'QUOTA_EXCEEDED') {
        return new Response(
          JSON.stringify({ error: "QUOTA_EXCEEDED" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update database for each item in the batch
      const results = [];
      for (const item of (batchResult as any[])) {
        const { error: updateError } = await supabase
          .from(postTable)
          .update({
            classification_label: item.labels[0],
            classification_confidence: item.scores[0],
            classification_data: item,
          })
          .eq("id", item.postId);

        if (updateError) {
          console.error(`Failed to update post ${item.postId}:`, updateError);
        } else {
          results.push({ postId: item.postId, success: true });
        }
      }

      return new Response(
        JSON.stringify({ success: true, processed: results.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Classifying content for ${postTable} ID: ${postId}`);
    const result = await classifyContent(content!);

    if (!result || !result.labels || !result.scores) {
      return new Response(
        JSON.stringify({ error: "Classification failed or returned invalid data" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const primaryLabel = result.labels[0];
    const confidence = result.scores[0];

    const { error: updateError } = await supabase
      .from(postTable)
      .update({
        classification_label: primaryLabel,
        classification_confidence: confidence,
        classification_data: result,
      })
      .eq("id", postId);

    if (updateError) {
      console.error("Failed to update post with classification:", updateError);
      return new Response(
        JSON.stringify({ error: "Database update failed", details: updateError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        label: primaryLabel,
        confidence: confidence,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Internal error in classify-text:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
