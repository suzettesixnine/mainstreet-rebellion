import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SELLER_PRICE = "price_1TAOi6Bt9FRIaveJAYN4gEaS";
const PRO_PRICE = "price_1TAOi7Bt9FRIaveJxkO0VuTA";

function priceToTier(priceId: string): "seller" | "pro" | "free" {
  if (priceId === PRO_PRICE) return "pro";
  if (priceId === SELLER_PRICE) return "seller";
  return "free";
}

serve(async (req) => {
  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!STRIPE_SECRET_KEY) {
    return new Response("STRIPE_SECRET_KEY not configured", { status: 500 });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  if (STRIPE_WEBHOOK_SECRET && sig) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
  } else {
    // In development, parse without verification
    event = JSON.parse(body);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (!userId || !session.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = subscription.items.data[0]?.price?.id;
        const tier = priceToTier(priceId || "");

        await supabase
          .from("seller_tiers")
          .update({
            tier,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: session.customer as string,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("user_id", userId);

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price?.id;
        const tier = subscription.status === "active" ? priceToTier(priceId || "") : "free";

        const { data: tierRow } = await supabase
          .from("seller_tiers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (tierRow) {
          await supabase
            .from("seller_tiers")
            .update({
              tier,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq("user_id", tierRow.user_id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: tierRow } = await supabase
          .from("seller_tiers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (tierRow) {
          await supabase
            .from("seller_tiers")
            .update({
              tier: "free",
              stripe_subscription_id: null,
              current_period_end: null,
            })
            .eq("user_id", tierRow.user_id);
        }
        break;
      }
    }
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
