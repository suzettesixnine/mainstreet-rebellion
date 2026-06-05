import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type InviteRow = {
  id: string;
  email: string | null;
  invited_by_label: string | null;
  invited_reason: string;
  zip_code: string | null;
  status: string;
  expires_at: string;
};

const sha256Hex = async (value: string) => {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token } = await req.json().catch(() => ({ token: "" }));
    const cleanToken = typeof token === "string" ? token.trim() : "";

    if (!/^[A-Za-z0-9_-]{16,160}$/.test(cleanToken)) {
      return new Response(JSON.stringify({ valid: false, status: "invalid" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Invite validation is not configured");

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const tokenHash = await sha256Hex(cleanToken);

    const { data, error } = await supabase
      .from("tester_invites")
      .select("id,email,invited_by_label,invited_reason,zip_code,status,expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error) throw error;
    const invite = data as InviteRow | null;
    if (!invite) {
      return new Response(JSON.stringify({ valid: false, status: "invalid" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expired = new Date(invite.expires_at).getTime() <= Date.now();
    const status = expired ? "expired" : invite.status;
    const valid = status === "pending";

    return new Response(JSON.stringify({
      valid,
      status,
      invite: valid ? {
        id: invite.id,
        email: invite.email,
        invitedBy: invite.invited_by_label,
        reason: invite.invited_reason,
        zipCode: invite.zip_code,
        expiresAt: invite.expires_at,
      } : null,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("validate-invite error:", error);
    return new Response(JSON.stringify({ error: "Invite validation failed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
