import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import ListingCard from "@/components/ListingCard";
import { Crown, MessageSquare, Star, Clock, MapPin } from "lucide-react";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Storefront() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const { data: storefront, isLoading } = useQuery({
    queryKey: ["storefront", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storefronts")
        .select("*")
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: profile } = useQuery({
    queryKey: ["storefront-profile", storefront?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", storefront!.user_id)
        .single();
      return data;
    },
    enabled: !!storefront?.user_id,
  });

  const { data: listings } = useQuery({
    queryKey: ["storefront-listings", storefront?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("seller_id", storefront!.user_id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!storefront?.user_id,
  });

  const { data: reviewStats } = useQuery({
    queryKey: ["storefront-reviews", storefront?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("rating")
        .eq("seller_id", storefront!.user_id);
      if (!data || data.length === 0) return { avg: 0, count: 0 };
      const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
      return { avg: Math.round(avg * 10) / 10, count: data.length };
    },
    enabled: !!storefront?.user_id,
  });

  const hours = (storefront?.operating_hours ?? {}) as Record<string, string>;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse font-display uppercase tracking-wider text-muted-foreground">Loading store…</div>
      </div>
    );
  }

  if (!storefront) {
    return (
      <div className="container max-w-2xl py-20 text-center">
        <h1 className="font-display text-4xl font-bold uppercase tracking-tighter text-foreground">Store not found</h1>
        <p className="mt-2 text-muted-foreground">This storefront doesn't exist or has been removed.</p>
        <Button asChild className="mt-6 uppercase tracking-wider font-display text-xs">
          <Link to="/browse">Browse listings</Link>
        </Button>
      </div>
    );
  }

  const initials = profile?.display_name
    ? profile.display_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const isOwner = user?.id === storefront.user_id;

  return (
    <div className="animate-fade-in">
      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-muted overflow-hidden">
        {storefront.banner_url ? (
          <img src={storefront.banner_url} alt="Store banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <span className="font-display text-6xl uppercase tracking-widest text-muted-foreground/30">
              {slug}
            </span>
          </div>
        )}
      </div>

      <div className="container max-w-5xl px-4">
        {/* Seller info */}
        <div className="relative -mt-12 flex flex-col sm:flex-row items-start gap-4 mb-8">
          <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-foreground text-background text-xl font-display">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 pt-2 sm:pt-6">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-tighter text-foreground">
                {profile?.display_name || slug}
              </h1>
              <Badge className="rounded-none uppercase tracking-wider text-xs font-display bg-foreground text-background px-2">
                <Crown className="h-3 w-3 mr-1" />Pro Seller
              </Badge>
            </div>
            {storefront.tagline && (
              <p className="mt-1 text-muted-foreground text-sm">{storefront.tagline}</p>
            )}
            {profile?.bio && (
              <p className="mt-2 text-sm text-foreground/80 max-w-xl">{profile.bio}</p>
            )}
            <div className="mt-3 flex items-center gap-4 flex-wrap">
              {reviewStats && reviewStats.count > 0 && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  {reviewStats.avg} ({reviewStats.count} reviews)
                </span>
              )}
              {profile?.zip_code && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />{profile.zip_code}
                </span>
              )}
              {!isOwner && user && (
                <Button size="sm" variant="outline" className="uppercase tracking-wider font-display text-xs" asChild>
                  <Link to={`/messages`}>
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />Message
                  </Link>
                </Button>
              )}
              {isOwner && (
                <Button size="sm" variant="outline" className="uppercase tracking-wider font-display text-xs" asChild>
                  <Link to="/profile">Edit store</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Operating hours */}
        {Object.keys(hours).length > 0 && (
          <Card className="border-foreground/20 mb-8">
            <CardContent className="py-4 px-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-display font-bold uppercase tracking-wider text-xs text-foreground">Hours</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-sm">
                {DAY_LABELS.map((day) => (
                  <div key={day} className="flex justify-between gap-2">
                    <span className="font-medium text-foreground">{day}</span>
                    <span className="text-muted-foreground">{hours[day] || "Closed"}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Separator className="mb-8" />

        {/* Listings grid */}
        <h2 className="font-display text-xl font-bold uppercase tracking-wider text-foreground mb-4">
          Listings ({listings?.length ?? 0})
        </h2>
        {listings && listings.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-12">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm pb-12">No active listings yet.</p>
        )}
      </div>
    </div>
  );
}
