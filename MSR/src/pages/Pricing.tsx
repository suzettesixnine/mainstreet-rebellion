import { useAuth } from "@/contexts/AuthContext";
import { TIER_LIMITS, STRIPE_PRICES, type SellerTier } from "@/lib/tiers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Loader2, TrendingUp, Users, ShieldCheck, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const FEATURES: Record<SellerTier, string[]> = {
  free: [
    "Up to 5 active listings",
    "3 photos per listing",
    "Basic messaging",
    "Community forum support",
  ],
  seller: [
    "Unlimited active listings",
    "8 photos per listing",
    "1 featured slot per month",
    "8% commission rate",
    "Enhanced profile with logo",
    "Seasonal badges",
    "Email support",
  ],
  pro: [
    "Unlimited active listings",
    "15 photos per listing + video",
    "8 featured slots per month",
    "5% commission rate",
    "Full storefront page",
    "Advanced analytics & export",
    "Bulk upload & CSV import/export",
    "Discount codes & promotions",
    "Multiple pickup locations",
    "Team accounts (up to 3)",
    "Verified Local Business badge",
    "Priority email + phone support",
  ],
};

const TIER_META: Record<SellerTier, { icon: typeof Check; accent: string; description: string }> = {
  free: { icon: Check, accent: "border-border", description: "Perfect for casual sellers and neighbors" },
  seller: { icon: Zap, accent: "border-primary", description: "For serious side-hustle sellers" },
  pro: { icon: Crown, accent: "border-foreground", description: "For legitimate small businesses" },
};

export default function Pricing() {
  const { user, sellerTier } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loadingTier, setLoadingTier] = useState<SellerTier | null>(null);

  const handleSubscribe = async (tier: "seller" | "pro") => {
    if (!user) {
      navigate("/signup");
      return;
    }
    setLoadingTier(tier);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { price_id: STRIPE_PRICES[tier] },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to start checkout", variant: "destructive" });
    } finally {
      setLoadingTier(null);
    }
  };

  const tiers: SellerTier[] = ["free", "seller", "pro"];

  return (
    <div className="container max-w-5xl py-12 px-4 animate-fade-in">
      {/* Hero section */}
      <div className="text-center mb-16">
        <Badge className="rounded-none uppercase tracking-wider text-xs font-display bg-primary/10 text-primary border border-primary/20 px-4 py-1 mb-6">
          <Rocket className="h-3 w-3 mr-1.5" />Built for local sellers
        </Badge>
        <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tighter text-foreground">
          Turn your craft<br />into a business
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Whether you're selling sourdough to your neighbors or running a full bakery operation,
          we've got a plan that grows with you. Start free — no credit card required.
        </p>
      </div>

      {/* How it works */}
      <div className="grid gap-6 md:grid-cols-3 mb-16">
        <div className="text-center p-6 border-2 border-border rounded-none">
          <div className="inline-flex items-center justify-center h-12 w-12 bg-primary/10 mb-4">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-display font-bold uppercase tracking-wider text-sm mb-2 text-foreground">List & connect</h3>
          <p className="text-sm text-muted-foreground">Post what you make — produce, baked goods, crafts, services. Your neighbors find you through search, events, and the community board.</p>
        </div>
        <div className="text-center p-6 border-2 border-border rounded-none">
          <div className="inline-flex items-center justify-center h-12 w-12 bg-primary/10 mb-4">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-display font-bold uppercase tracking-wider text-sm mb-2 text-foreground">Grow your following</h3>
          <p className="text-sm text-muted-foreground">Build a reputation with reviews, featured placements, and a dedicated storefront. Repeat customers come back every week.</p>
        </div>
        <div className="text-center p-6 border-2 border-border rounded-none">
          <div className="inline-flex items-center justify-center h-12 w-12 bg-primary/10 mb-4">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-display font-bold uppercase tracking-wider text-sm mb-2 text-foreground">Keep more of what you earn</h3>
          <p className="text-sm text-muted-foreground">Lower commission rates as you grow. Pro sellers keep 95% of every sale — that's money back in your pocket, not ours.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => {
          const limits = TIER_LIMITS[tier];
          const meta = TIER_META[tier];
          const isCurrentTier = sellerTier === tier;
          const Icon = meta.icon;

          return (
            <Card
              key={tier}
              className={`relative rounded-none border-2 ${meta.accent} ${
                tier === "seller" ? "md:scale-105 shadow-lg" : "shadow-none"
              }`}
            >
              {tier === "seller" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="rounded-none uppercase tracking-wider text-xs font-display bg-primary text-primary-foreground px-3">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle className="font-display uppercase tracking-wider text-lg">
                    {limits.label}
                  </CardTitle>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-4xl font-black text-foreground">
                    ${limits.price}
                  </span>
                  {limits.price > 0 && (
                    <span className="text-sm text-muted-foreground">/month</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{meta.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {FEATURES[tier].map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {isCurrentTier ? (
                  <Button
                    disabled
                    className="w-full rounded-none font-display uppercase tracking-wider text-xs h-11"
                    variant="outline"
                  >
                    Current plan
                  </Button>
                ) : tier === "free" ? (
                  <Button
                    variant="outline"
                    disabled
                    className="w-full rounded-none font-display uppercase tracking-wider text-xs h-11"
                  >
                    {sellerTier === "free" ? "Current plan" : "Included"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSubscribe(tier)}
                    disabled={loadingTier !== null}
                    className={`w-full rounded-none font-display uppercase tracking-wider text-xs h-11 border-2 ${
                      tier === "pro" ? "bg-foreground text-background hover:bg-foreground/90 border-foreground" : "border-primary"
                    }`}
                  >
                    {loadingTier === tier ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {loadingTier === tier ? "Loading..." : `Upgrade to ${limits.label}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Social proof + FAQ */}
      <div className="mt-16 border-t-2 border-border pt-12">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl md:text-3xl font-black uppercase tracking-tighter text-foreground mb-4">
            Join hundreds of local sellers
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From backyard gardeners to full-time bakers, our sellers are building real businesses
            rooted in their communities. Here's what they're saying:
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-12">
          <Card className="rounded-none border-2 border-border shadow-none">
            <CardContent className="pt-6">
              <p className="text-sm italic text-muted-foreground mb-3">
                "I went from selling eggs to 3 neighbors to filling 40+ orders a week. The Seller plan paid for itself in the first weekend."
              </p>
              <p className="font-display text-xs uppercase tracking-wider font-bold text-foreground">— Sarah K., Backyard Farm</p>
            </CardContent>
          </Card>
          <Card className="rounded-none border-2 border-border shadow-none">
            <CardContent className="pt-6">
              <p className="text-sm italic text-muted-foreground mb-3">
                "The Pro storefront is a game-changer. Customers can see all my breads in one place, check my hours, and message me directly."
              </p>
              <p className="font-display text-xs uppercase tracking-wider font-bold text-foreground">— Marcus T., Artisan Bakery</p>
            </CardContent>
          </Card>
          <Card className="rounded-none border-2 border-border shadow-none">
            <CardContent className="pt-6">
              <p className="text-sm italic text-muted-foreground mb-3">
                "I love that I can start free and see if there's demand before committing. Turns out my candles are a hit — upgrading this month!"
              </p>
              <p className="font-display text-xs uppercase tracking-wider font-bold text-foreground">— Priya M., Handmade Candles</p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-2 text-sm text-muted-foreground">
          <p className="font-display font-bold uppercase tracking-wider text-foreground text-base">No risk, no contracts</p>
          <p>All plans include basic messaging and community forum access.</p>
          <p>Upgrade, downgrade, or cancel anytime — we keep it simple.</p>
          <p className="mt-4">
            <span className="font-display uppercase tracking-wider text-xs font-bold text-primary">Questions?</span>
            {" "}Reach out on the community board — we're sellers too.
          </p>
        </div>
      </div>
    </div>
  );
}
