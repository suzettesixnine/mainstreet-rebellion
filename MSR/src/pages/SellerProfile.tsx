import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Star, Store, Crown, Zap, MapPin, ChevronLeft, ChevronRight, X } from "lucide-react";
import ListingCard from "@/components/ListingCard";
import type { Tables } from "@/integrations/supabase/types";

export default function SellerProfile() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [listings, setListings] = useState<Tables<"listings">[]>([]);
  const [reviews, setReviews] = useState<(Tables<"reviews"> & { reviewer_name?: string })[]>([]);
  const [tier, setTier] = useState<string>("free");
  const [storefrontSlug, setStorefrontSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [coverLightbox, setCoverLightbox] = useState(false);
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [{ data: p }, { data: l }, { data: r }, { data: t }, { data: s }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", id).single(),
        supabase.from("listings").select("*").eq("seller_id", id).eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("reviews").select("*").eq("seller_id", id).order("created_at", { ascending: false }),
        supabase.from("seller_tiers").select("tier").eq("user_id", id).single(),
        supabase.from("storefronts").select("slug").eq("user_id", id).single(),
      ]);
      setProfile(p ?? null);
      setListings(l ?? []);
      setTier(t?.tier ?? "free");
      setStorefrontSlug(s?.slug ?? null);

      // Enrich reviews with reviewer names
      if (r && r.length > 0) {
        const reviewerIds = [...new Set(r.map(rev => rev.reviewer_id))];
        const { data: reviewerProfiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", reviewerIds);
        const nameMap = new Map(reviewerProfiles?.map(rp => [rp.user_id, rp.display_name]) ?? []);
        setReviews(r.map(rev => ({ ...rev, reviewer_name: nameMap.get(rev.reviewer_id) ?? undefined })));
      } else {
        setReviews([]);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div className="container py-16 text-center font-display uppercase tracking-wider text-muted-foreground">Loading...</div>;
  if (!profile) return <div className="container py-16 text-center font-display uppercase tracking-wider text-muted-foreground">Seller not found</div>;

  const initials = profile.display_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const avgRating = reviews.length > 0
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const coverPhotoUrl = profile?.cover_photo_url ?? null;
  const galleryImages = profile?.gallery_images ?? [];

  return (
    <div className="container max-w-4xl px-4 py-12 animate-fade-in">
      {/* Cover photo */}
      {coverPhotoUrl && (
        <>
          <button
            onClick={() => setCoverLightbox(true)}
            className="relative w-full h-48 md:h-64 rounded-sm overflow-hidden mb-8 border border-border cursor-zoom-in hover:opacity-90 transition-opacity"
          >
            <img src={coverPhotoUrl} alt="Cover" className="w-full h-full object-cover" />
          </button>
          <Dialog open={coverLightbox} onOpenChange={setCoverLightbox}>
            <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-none bg-transparent shadow-none [&>button]:hidden">
              <div className="relative flex items-center justify-center">
                <img src={coverPhotoUrl} alt="Cover" className="max-w-full max-h-[85vh] object-contain rounded-sm" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-background/80 hover:bg-background text-foreground rounded-full"
                  onClick={() => setCoverLightbox(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10">
        <Avatar className="h-24 w-24">
          <AvatarImage src={profile.avatar_url || undefined} />
          <AvatarFallback className="bg-foreground text-background text-2xl font-display">{initials}</AvatarFallback>
        </Avatar>
        <div className="text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
            <h1 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-tighter text-foreground">
              {profile.display_name || "Seller"}
            </h1>
            {tier === "seller" && (
              <Badge className="rounded-none uppercase tracking-wider text-xs font-display bg-primary text-primary-foreground">
                <Zap className="h-3 w-3 mr-1" />Seller
              </Badge>
            )}
            {tier === "pro" && (
              <Badge className="rounded-none uppercase tracking-wider text-xs font-display bg-foreground text-background">
                <Crown className="h-3 w-3 mr-1" />Pro
              </Badge>
            )}
          </div>
          {profile.zip_code && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground font-display tracking-wider justify-center sm:justify-start">
              <MapPin className="h-3.5 w-3.5" />{profile.zip_code}
            </p>
          )}
          {profile.bio && <p className="mt-2 text-foreground max-w-lg">{profile.bio}</p>}
          <div className="flex flex-wrap items-center gap-4 mt-3 justify-center sm:justify-start">
            {avgRating && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-warning text-warning" />
                {avgRating} ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
              </span>
            )}
            {storefrontSlug && (
              <Button variant="outline" size="sm" className="rounded-none font-display uppercase tracking-wider text-xs border-foreground/30" asChild>
                <Link to={`/store/${storefrontSlug}`}>
                  <Store className="mr-1.5 h-3.5 w-3.5" />Visit Store
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Active Listings */}
      <h2 className="font-display text-xl font-bold mb-4 uppercase tracking-wider text-foreground">
        Listings ({listings.length})
      </h2>
      {listings.length === 0 ? (
        <p className="text-muted-foreground font-display uppercase tracking-wider text-sm py-8 text-center border border-dashed border-border">
          No active listings
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {listings.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {/* Photo gallery */}
      {galleryImages.length > 0 && (
        <>
          <h2 className="font-display text-xl font-bold mt-10 mb-4 uppercase tracking-wider text-foreground">
            Photos ({galleryImages.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {galleryImages.map((url, i) => (
              <button
                key={i}
                onClick={() => setLightboxIndex(i)}
                className="aspect-square rounded-sm overflow-hidden border border-border bg-muted cursor-zoom-in hover:opacity-90 transition-opacity"
              >
                <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {/* Lightbox */}
          <Dialog open={lightboxIndex !== null} onOpenChange={() => setLightboxIndex(null)}>
            <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-none bg-transparent shadow-none [&>button]:hidden">
              <div className="relative flex items-center justify-center">
                <img
                  src={galleryImages[lightboxIndex ?? 0]}
                  alt={`Gallery ${(lightboxIndex ?? 0) + 1}`}
                  className="max-w-full max-h-[85vh] object-contain rounded-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-background/80 hover:bg-background text-foreground rounded-full"
                  onClick={() => setLightboxIndex(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
                {galleryImages.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground rounded-full"
                      onClick={() => setLightboxIndex((prev) => (prev! - 1 + galleryImages.length) % galleryImages.length)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground rounded-full"
                      onClick={() => setLightboxIndex((prev) => (prev! + 1) % galleryImages.length)}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}
                {galleryImages.length > 1 && (
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 text-foreground text-xs font-display uppercase tracking-wider px-3 py-1 rounded-full">
                    {(lightboxIndex ?? 0) + 1} / {galleryImages.length}
                  </span>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <>
          <h2 className="font-display text-xl font-bold mt-10 mb-4 uppercase tracking-wider text-foreground">
            Reviews ({reviews.length})
          </h2>
          <div className="space-y-3">
            {reviews.map(review => (
              <Card key={review.id} className="border-foreground/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < review.rating ? "fill-warning text-warning" : "text-muted"}`} />
                    ))}
                  </div>
                  {review.comment && <p className="text-sm text-foreground">{review.comment}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {review.reviewer_name && <span className="font-medium text-foreground">{review.reviewer_name} · </span>}
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
