import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client to get the authenticated user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { listing_id } = await req.json();
    if (!listing_id) {
      return new Response(JSON.stringify({ error: "listing_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for privileged queries
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get listing
    const { data: listing, error: listingError } = await adminClient
      .from("listings")
      .select("seller_id, digital_file_url, is_digital")
      .eq("id", listing_id)
      .single();

    if (listingError || !listing) {
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!listing.is_digital || !listing.digital_file_url) {
      return new Response(JSON.stringify({ error: "Not a digital product" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Allow the seller to always download their own file
    const isSeller = user.id === listing.seller_id;

    if (!isSeller) {
      // Check if user has an existing conversation for this listing
      const { data: conversation } = await adminClient
        .from("conversations")
        .select("id")
        .eq("listing_id", listing_id)
        .eq("buyer_id", user.id)
        .limit(1)
        .single();

      if (!conversation) {
        return new Response(JSON.stringify({ error: "You must message the seller before downloading" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Generate signed URL with admin client
    const { data: signedUrlData, error: signedError } = await adminClient.storage
      .from("digital-products")
      .createSignedUrl(listing.digital_file_url, 120); // 2 minute expiry

    if (signedError || !signedUrlData?.signedUrl) {
      return new Response(JSON.stringify({ error: "Failed to generate download link" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: signedUrlData.signedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
