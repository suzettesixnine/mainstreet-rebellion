import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ListingCard from "@/components/ListingCard";
import { GUILDS } from "@/lib/guilds";
import { Search, ArrowRight, Calendar, MessageCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type ListingWithProfile = Tables<"listings"> & { profiles: { display_name: string | null; avatar_url: string | null } | null };

export default function Index() {
  const [listings, setListings] = useState<ListingWithProfile[]>([]);
  const [search, setSearch] = useState("");
  const [zip, setZip] = useState("");
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchListings = async () => {
      const { data } = await supabase
        .from("listings")
        .select("*, profiles(display_name, avatar_url)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(12);
      if (data) setListings(data as unknown as ListingWithProfile[]);
    };
    fetchListings();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/browse?q=${encodeURIComponent(search)}`);
  };

  const handleZipSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (zip.trim()) navigate(`/neighborhood/${zip.trim()}`);
  };

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-background py-20 md:py-32">
        <div className="container px-4">
          <div className="mx-auto max-w-3xl">
            <h1 className="font-display text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter uppercase leading-[0.85] text-foreground">
              Mainstreet
              <br />
              <span className="text-primary">Rebellion</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl tracking-tight">
              Every neighborhood needs a butcher, a baker, a candlestick maker. Find yours — or become one.
            </p>
            <form onSubmit={handleSearch} className="mt-10 flex gap-0 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search for anything..."
                  className="pl-10 h-12 text-base rounded-none border-foreground"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 rounded-none uppercase tracking-wider font-display">Search</Button>
            </form>
          </div>
        </div>
      </section>

      {/* Find Your Neighborhood */}
      <section className="container px-4 py-12 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-xl font-bold uppercase tracking-wider text-foreground">Find Your Street</h2>
            <p className="text-sm text-muted-foreground mt-1">See which guilds your neighborhood has — and which it needs.</p>
          </div>
          {profile?.zip_code && (
            <Button variant="ghost" size="sm" className="uppercase tracking-wider font-display text-xs" asChild>
              <Link to={`/neighborhood/${profile.zip_code}`}>
                My neighborhood ({profile.zip_code}) <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
        <form onSubmit={handleZipSearch} className="flex gap-0 max-w-sm">
          <Input
            value={zip}
            onChange={e => setZip(e.target.value)}
            placeholder="Enter your zip code..."
            className="h-12 rounded-none border-foreground text-base font-display"
            maxLength={10}
          />
          <Button type="submit" size="lg" className="h-12 rounded-none uppercase tracking-wider font-display">
            Go
          </Button>
        </form>
      </section>

      {/* The Guilds */}
      <section className="container px-4 py-12">
        <h2 className="font-display text-xl font-bold mb-6 uppercase tracking-wider text-foreground">The Guilds</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {GUILDS.map(guild => {
            const Icon = guild.icon;
            return (
              <Link
                key={guild.key}
                to={`/browse?category=${guild.key}`}
                className="group flex flex-col items-center gap-2 border-2 border-foreground bg-card p-5 text-center transition-colors hover:bg-foreground hover:text-background"
              >
                <Icon className="h-7 w-7" />
                <span className="font-display text-sm font-bold uppercase tracking-wider leading-tight">{guild.label}</span>
                <span className="text-[11px] opacity-60 leading-tight">{guild.description}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent listings */}
      <section className="container px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold uppercase tracking-wider text-foreground">Fresh from the Street</h2>
          <Button variant="ghost" size="sm" className="uppercase tracking-wider font-display text-xs" asChild>
            <Link to="/browse">View all <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
        {listings.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground border border-dashed border-border">
            <p className="text-lg font-display">No listings yet. Be the first to open a shop.</p>
            <Button className="mt-4 uppercase tracking-wider font-display" asChild>
              <Link to="/listings/new">Open a shop</Link>
            </Button>
          </div>
        )}
      </section>

      {/* Community CTA */}
      <section className="container px-4 pb-16">
        <h2 className="font-display text-xl font-bold mb-6 uppercase tracking-wider text-foreground">Community</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Link to="/events" className="group flex items-center gap-4 border-2 border-foreground bg-card p-6 transition-colors hover:bg-foreground hover:text-background">
            <Calendar className="h-8 w-8 shrink-0" />
            <div>
              <h3 className="font-display font-bold uppercase tracking-wider">Events</h3>
              <p className="text-sm opacity-70">Local gatherings, markets & meetups</p>
            </div>
            <ArrowRight className="ml-auto h-5 w-5 opacity-50 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link to="/discussions" className="group flex items-center gap-4 border-2 border-foreground bg-card p-6 transition-colors hover:bg-foreground hover:text-background">
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
