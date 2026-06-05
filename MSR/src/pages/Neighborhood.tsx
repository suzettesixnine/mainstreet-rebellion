import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { GUILDS, getGuild } from "@/lib/guilds";
import ListingCard from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowRight, Calendar, MessageCircle, Plus } from "lucide-react";
import NeighborhoodSuggestions from "@/components/NeighborhoodSuggestions";
import type { Tables } from "@/integrations/supabase/types";

type ListingWithProfile = Tables<"listings"> & {
  profiles: { display_name: string | null; avatar_url: string | null } | null;
};

export default function Neighborhood() {
  const { zip } = useParams<{ zip: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [zipInput, setZipInput] = useState(zip || "");
  const [guildCounts, setGuildCounts] = useState<Record<string, number>>({});
  const [listings, setListings] = useState<ListingWithProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const activeZip = zip || profile?.zip_code;

  useEffect(() => {
    if (!activeZip) return;
    setZipInput(activeZip);
    fetchData(activeZip);
  }, [activeZip]);

  const fetchData = async (z: string) => {
    setLoading(true);

    // Fetch listings for this zip
    const { data: listingsData } = await supabase
      .from("listings")
      .select("*")
      .eq("zip_code", z)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(20);

    const items = (listingsData || []) as unknown as ListingWithProfile[];

    // Fetch profiles
    const sellerIds = [...new Set(items.map((l) => l.seller_id))];
    if (sellerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", sellerIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      items.forEach((l) => {
        const p = profileMap.get(l.seller_id);
        (l as any).profiles = p ? { display_name: p.display_name, avatar_url: p.avatar_url } : null;
      });
    }

    // Count by category
    const counts: Record<string, number> = {};
    items.forEach((l) => {
      counts[l.category] = (counts[l.category] || 0) + 1;
    });

    setGuildCounts(counts);
    setListings(items);
    setLoading(false);
  };

  const handleZipSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (zipInput.trim()) navigate(`/neighborhood/${zipInput.trim()}`);
  };

  // No zip at all — show search
  if (!activeZip) {
    return (
      <div className="container px-4 py-20 animate-fade-in">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="font-display text-5xl md:text-7xl font-bold uppercase tracking-tighter text-foreground leading-[0.9]">
            Find Your
            <br />
            <span className="text-primary">Street</span>
          </h1>
          <p className="mt-4 text-muted-foreground">Enter your zip code to see your neighborhood&apos;s guild board.</p>
          <form onSubmit={handleZipSearch} className="mt-8 flex gap-0 max-w-sm mx-auto">
            <Input
              value={zipInput}
              onChange={(e) => setZipInput(e.target.value)}
              placeholder="Enter zip code..."
              className="h-12 rounded-none border-foreground text-base font-display"
              maxLength={10}
            />
            <Button type="submit" size="lg" className="h-12 rounded-none uppercase tracking-wider font-display">
              Go
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const totalListings = listings.length;
  const filledGuilds = GUILDS.filter((g) => (guildCounts[g.key] || 0) > 0).length;
  const neededGuilds = GUILDS.length - filledGuilds;

  return (
    <div className="container px-4 py-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
        <div>
          <p className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-1">Your Neighborhood</p>
          <h1 className="font-display text-5xl md:text-7xl font-bold uppercase tracking-tighter text-foreground leading-[0.9]">
            {activeZip}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {totalListings} active listing{totalListings !== 1 ? "s" : ""} · {filledGuilds} guild{filledGuilds !== 1 ? "s" : ""} filled
            {neededGuilds > 0 && (
              <span className="text-primary font-semibold"> · {neededGuilds} needed</span>
            )}
          </p>
        </div>
        <form onSubmit={handleZipSearch} className="flex gap-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={zipInput}
              onChange={(e) => setZipInput(e.target.value)}
              placeholder="Change zip..."
              className="pl-10 h-10 rounded-none border-foreground text-sm font-display w-40"
              maxLength={10}
            />
          </div>
          <Button type="submit" size="sm" className="h-10 rounded-none uppercase tracking-wider font-display text-xs">
            Go
          </Button>
        </form>
      </div>

      {/* Guild Board */}
      <section className="mb-12">
        <h2 className="font-display text-xl font-bold mb-6 uppercase tracking-wider text-foreground">Guild Board</h2>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {GUILDS.map((guild) => {
              const count = guildCounts[guild.key] || 0;
              const needed = count === 0;
              const Icon = guild.icon;
              return (
                <Link
                  key={guild.key}
                  to={`/browse?category=${guild.key}&q=&zip=${activeZip}`}
                  className={`group relative flex flex-col items-center justify-center gap-2 border-2 p-5 text-center transition-all
                    ${needed
                      ? "border-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground"
                      : "border-foreground bg-card hover:bg-foreground hover:text-background"
                    }`}
                >
                  <Icon className="h-7 w-7" />
                  <span className="font-display text-sm font-bold uppercase tracking-wider leading-tight">{guild.label}</span>
                  <span className="text-xs opacity-70">
                    {count} shop{count !== 1 ? "s" : ""}
                  </span>
                  {needed && (
                    <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-display uppercase tracking-wider px-1.5 py-0 rounded-none border-0">
                      Needed!
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Needed CTA */}
      {neededGuilds > 0 && !loading && (
        <section className="mb-12 border-2 border-primary p-6">
          <h3 className="font-display text-lg font-bold uppercase tracking-wider text-foreground mb-2">
            Your street needs you
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {neededGuilds} guild{neededGuilds !== 1 ? "s are" : " is"} empty in {activeZip}. Be the first to open up shop.
          </p>
          <div className="flex flex-wrap gap-2">
            {GUILDS.filter((g) => !guildCounts[g.key]).map((guild) => (
              <Link
                key={guild.key}
                to={`/listings/new?category=${guild.key}&zip=${activeZip}`}
                className="flex items-center gap-1.5 border border-primary bg-primary/5 px-3 py-1.5 text-xs font-display uppercase tracking-wider text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Plus className="h-3 w-3" />
                {guild.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Suggestions */}
      <NeighborhoodSuggestions zipCode={activeZip} />

      {/* Recent listings */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold uppercase tracking-wider text-foreground">Fresh from the Street</h2>
          <Button variant="ghost" size="sm" className="uppercase tracking-wider font-display text-xs" asChild>
            <Link to={`/browse?q=&zip=${activeZip}`}>
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {listings.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.slice(0, 8).map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground border border-dashed border-border">
            <p className="text-lg font-display">No shops on this street yet. Be the first.</p>
            <Button className="mt-4 uppercase tracking-wider font-display" asChild>
              <Link to={`/listings/new?zip=${activeZip}`}>Open a shop</Link>
            </Button>
          </div>
        )}
      </section>

      {/* Community links */}
      <section>
        <h2 className="font-display text-xl font-bold mb-6 uppercase tracking-wider text-foreground">Community</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            to="/events"
            className="group flex items-center gap-4 border-2 border-foreground bg-card p-6 transition-colors hover:bg-foreground hover:text-background"
          >
            <Calendar className="h-8 w-8 shrink-0" />
            <div>
              <h3 className="font-display font-bold uppercase tracking-wider">Events</h3>
              <p className="text-sm opacity-70">Local gatherings, markets & meetups</p>
            </div>
            <ArrowRight className="ml-auto h-5 w-5 opacity-50 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link
            to="/discussions"
            className="group flex items-center gap-4 border-2 border-foreground bg-card p-6 transition-colors hover:bg-foreground hover:text-background"
          >
            <MessageCircle className="h-8 w-8 shrink-0" />
            <div>
              <h3 className="font-display font-bold uppercase tracking-wider">Community Board</h3>
              <p className="text-sm opacity-70">Announcements, questions & discussions</p>
            </div>
            <ArrowRight className="ml-auto h-5 w-5 opacity-50 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>
      </section>
    </div>
  );
}
