import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ListingCard from "@/components/ListingCard";
import MapFilter, { MapPin } from "@/components/MapFilter";
import { geocodeZips } from "@/lib/geocode";
import { Search } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type ListingWithProfile = Tables<"listings"> & { profiles: { display_name: string | null; avatar_url: string | null } | null };

import { GUILDS } from "@/lib/guilds";

const CATEGORY_OPTIONS = [
  { value: "all", label: "All guilds" },
  ...GUILDS.map((g) => ({ value: g.key, label: g.label })),
];

export default function Browse() {
  const { user, profile, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<ListingWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [sort, setSort] = useState("newest");
  const [coordsMap, setCoordsMap] = useState<Map<string, { lat: number; lng: number }>>(new Map());
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);

  const fetchListings = async () => {
    setLoading(true);
    let query = supabase
      .from("listings")
      .select("*")
      .eq("status", "active");

    if (category && category !== "all") {
      query = query.eq("category", category as any);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (sort === "newest") query = query.order("created_at", { ascending: false });
    else if (sort === "price_low") query = query.order("price", { ascending: true });
    else if (sort === "price_high") query = query.order("price", { ascending: false });

    const { data } = await query.limit(50);
    const listingsData = (data || []) as unknown as ListingWithProfile[];

    // Fetch seller profiles separately
    const sellerIds = [...new Set(listingsData.map(l => l.seller_id))];
    if (sellerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", sellerIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      listingsData.forEach(l => {
        const p = profileMap.get(l.seller_id);
        (l as any).profiles = p ? { display_name: p.display_name, avatar_url: p.avatar_url } : null;
      });
    }
    setListings(listingsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchListings();
  }, [category, sort]);

  // Geocode zip codes for map pins
  useEffect(() => {
    const zips = listings.map((l) => l.zip_code);
    if (zips.length === 0) return;
    geocodeZips(zips).then(setCoordsMap);
  }, [listings]);

  const mapPins: MapPin[] = useMemo(
    () =>
      listings
        .filter((l) => coordsMap.has(l.zip_code))
        .map((l) => ({
          id: l.id,
          lat: coordsMap.get(l.zip_code)!.lat,
          lng: coordsMap.get(l.zip_code)!.lng,
          label: l.title,
        })),
    [listings, coordsMap]
  );

  const userCenter = useMemo(() => {
    if (profile?.zip_code && coordsMap.has(profile.zip_code)) return coordsMap.get(profile.zip_code);
    return undefined;
  }, [profile, coordsMap]);

  const handleBoundsChange = useCallback((bounds: typeof mapBounds) => setMapBounds(bounds), []);

  const filteredListings = useMemo(() => {
    if (!mapBounds) return listings;
    return listings.filter((l) => {
      const c = coordsMap.get(l.zip_code);
      if (!c) return false;
      return c.lat >= mapBounds.south && c.lat <= mapBounds.north && c.lng >= mapBounds.west && c.lng <= mapBounds.east;
    });
  }, [listings, mapBounds, coordsMap]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: search, ...(category !== "all" ? { category } : {}) });
    fetchListings();
  };

  if (authLoading) return null;

  return (
    <div className="container px-4 py-12 animate-fade-in">
      <h1 className="font-display text-4xl md:text-5xl font-bold uppercase tracking-tighter mb-8 text-foreground">Browse</h1>

      <div className="flex flex-col sm:flex-row gap-0 mb-10">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search listings..."
            className="pl-10 h-12 rounded-none border-foreground text-base font-display"
          />
        </form>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-48 h-12 rounded-none border-foreground font-display uppercase tracking-wider text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="font-display uppercase tracking-wider text-xs">{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-full sm:w-48 h-12 rounded-none border-foreground font-display uppercase tracking-wider text-xs">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest" className="font-display uppercase tracking-wider text-xs">Newest first</SelectItem>
            <SelectItem value="price_low" className="font-display uppercase tracking-wider text-xs">Price: Low → High</SelectItem>
            <SelectItem value="price_high" className="font-display uppercase tracking-wider text-xs">Price: High → Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <MapFilter pins={mapPins} center={userCenter} onBoundsChange={handleBoundsChange} />

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredListings.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredListings.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-border">
          <p className="text-lg font-display uppercase tracking-wider text-muted-foreground">No listings found</p>
          <p className="text-sm mt-2 text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
