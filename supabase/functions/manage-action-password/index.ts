import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.50.3";
import Argon2id from "jsr:@rabbit-company/argon2id@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActionRequest {
  action: "set" | "verify" | "update_settings" | "disable";
  password?: string;
  settings?: any;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body: ActionRequest = await req.json();
    const { action, password, settings } = body;

    console.log(`Action: ${req.method} ${action || 'unknown'}`);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // We use a transaction-like approach by setting the bypass flag and then performing the update.
    // In PostgREST, multiple calls might not share the same connection/session.
    // To ensure the bypass flag is active during the update, we can try to use a single RPC call if needed,
    // or just set it to NOT be local (is_local: false) so it sticks to the session.
    // But even better, we should probably set it right before the database operations.

    const fetchCurrentHash = async () => {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("action_password_hash")
        .eq("id", user.id)
        .single();
      
      if (fetchError || !data?.action_password_hash) {
        throw new Error("Action password not set");
      }
      return data.action_password_hash;
    };

    const verifyPassword = async (pwd: string) => {
      const hash = await fetchCurrentHash();
      const isValid = await Argon2id.verify(hash, pwd);
      if (!isValid) {
        throw new Error("Invalid password");
      }
      return true;
    };

    if (action === "set") {
      if (!password || password.length < 10) {
        return new Response(JSON.stringify({ error: "Invalid password" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const hash = await Argon2id.hashEncoded(password);
      
      const { error: updateError } = await supabase.rpc('rpc_manage_action_password', {
        p_user_id: user.id,
        p_action_password_hash: hash
      });

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "verify") {
      if (!password) {
        return new Response(JSON.stringify({ error: "Password required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const isValid = await verifyPassword(password);
        return new Response(JSON.stringify({ isValid: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ isValid: false, error: err.message }), {
          status: 200, // Still 200 but isValid: false for the frontend
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

    } else if (action === "update_settings") {
      if (!settings) {
        return new Response(JSON.stringify({ error: "Settings required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!password) {
        return new Response(JSON.stringify({ error: "Password required to update settings" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        await verifyPassword(password);
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Ensure deleteAccount is always true
      const finalSettings = { ...settings, deleteAccount: true };

      const { error: updateError } = await supabase.rpc('rpc_manage_action_password', {
        p_user_id: user.id,
        p_action_password_settings: finalSettings
      });

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "disable") {
      // Need to verify password before disabling
      if (!password) {
        return new Response(JSON.stringify({ error: "Password required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        await verifyPassword(password);
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await supabase.rpc('rpc_manage_action_password', {
        p_user_id: user.id,
        p_clear_password: true
      });

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
