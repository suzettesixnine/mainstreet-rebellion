import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MapPin, MessageSquare, Star, ArrowLeft, Truck, Package, DollarSign, FileDown, Download, Store } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const CATEGORY_LABELS: Record<string, string> = {
  produce: "Produce", baked_goods: "Baked Goods", crafts: "Crafts", services: "Services",
  prepared_foods: "Prepared Foods", clothing: "Clothing", home_goods: "Home Goods", digital_goods: "Digital Goods", other: "Other",
};
const DELIVERY_LABELS: Record<string, string> = { pickup: "Pickup only", delivery: "Delivery available", both: "Pickup & delivery" };

type SellerProfile = Tables<"profiles">;

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [listing, setListing] = useState<Tables<"listings"> | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [sellerRating, setSellerRating] = useState<{ avg: number; count: number }>({ avg: 0, count: 0 });
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasConversation, setHasConversation] = useState(false);
  const [storefrontSlug, setStorefrontSlug] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      const { data: l } = await supabase.from("listings").select("*").eq("id", id).single();
      if (!l) { setLoading(false); return; }
      setListing(l);
      const [{ data: p }, { data: storefront }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", l.seller_id).single(),
        supabase.from("storefronts").select("slug").eq("user_id", l.seller_id).single(),
      ]);
      setSeller(p);
      setStorefrontSlug(storefront?.slug ?? null);
      const { data: reviews } = await supabase.from("reviews").select("rating").eq("seller_id", l.seller_id);
      if (reviews && reviews.length > 0) {
        const avg = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;
        setSellerRating({ avg: Math.round(avg * 10) / 10, count: reviews.length });
      }
      // Check if current user has a conversation for this listing (for download access)
      if (user && l.is_digital && user.id !== l.seller_id) {
        const { data: conv } = await supabase
          .from("conversations")
          .select("id")
          .eq("listing_id", id)
          .eq("buyer_id", user.id)
          .limit(1)
          .single();
        setHasConversation(!!conv);
      } else if (user && l.seller_id === user.id) {
        setHasConversation(true); // seller always has access
      }
      setLoading(false);
    };
    fetch();
  }, [id, user]);

  const handleContact = async () => {
    if (!user) { navigate("/login"); return; }
    if (!listing) return;
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("buyer_id", user.id)
      .single();
    if (existing) {
      navigate(`/messages/${existing.id}`);
      return;
    }
    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({ listing_id: listing.id, buyer_id: user.id, seller_id: listing.seller_id })
      .select("id")
      .single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    navigate(`/messages/${conv.id}`);
  };

  if (loading) return <div className="container py-16 text-center font-display uppercase tracking-wider text-muted-foreground">Loading...</div>;
  if (!listing) return <div className="container py-16 text-center font-display uppercase tracking-wider text-muted-foreground">Listing not found</div>;

  const images = listing.images || [];
  const sellerInitials = seller?.display_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const isOwnListing = user?.id === listing.seller_id;

  return (
    <div className="container max-w-4xl px-4 py-12 animate-fade-in">
      <Button variant="ghost" size="sm" className="mb-6 rounded-none font-display uppercase tracking-wider text-xs" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-1 h-4 w-4" />Back
      </Button>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Images */}
        <div>
          <div className="aspect-square overflow-hidden bg-muted border border-border">
            {images[selectedImage] ? (
              <img src={images[selectedImage]} alt={listing.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <span className="font-display text-3xl uppercase tracking-wider opacity-30">MSR</span>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`h-16 w-16 flex-shrink-0 overflow-hidden border-2 transition-colors ${i === selectedImage ? "border-primary" : "border-border hover:border-foreground"}`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2 py-0.5 text-xs font-display uppercase tracking-wider border border-border bg-secondary text-secondary-foreground">{CATEGORY_LABELS[listing.category]}</span>
            {listing.is_digital && (
              <span className="px-2 py-0.5 text-xs font-display uppercase tracking-wider border border-accent bg-accent text-accent-foreground flex items-center gap-1">
                <FileDown className="h-3 w-3" />Digital
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-tighter text-foreground">{listing.title}</h1>
          <p className="mt-1 font-display text-3xl md:text-4xl font-bold text-primary">${Number(listing.price).toFixed(2)}</p>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground font-display tracking-wider">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{listing.zip_code}</span>
            {!listing.is_digital && (
              <span className="flex items-center gap-1">
                {listing.delivery_option === "delivery" ? <Truck className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                {DELIVERY_LABELS[listing.delivery_option]}
              </span>
            )}
            {listing.quantity > 1 && <span>{listing.quantity} available</span>}
          </div>

          {listing.is_digital && listing.digital_file_url && user && hasConversation && (
            <Button
              className="mt-4 w-full rounded-none font-display uppercase tracking-wider"
              onClick={async () => {
                const { data, error } = await supabase.functions.invoke("download-digital-product", {
                  body: { listing_id: listing.id },
                });
                if (error || !data?.url) {
                  toast({ title: "Download failed", description: data?.error || error?.message || "Could not generate download link", variant: "destructive" });
                  return;
                }
                window.open(data.url, "_blank");
              }}
            >
              <Download className="mr-2 h-4 w-4" />Download file
            </Button>
          )}
          {listing.is_digital && listing.digital_file_url && user && !hasConversation && !isOwnListing && (
            <p className="mt-4 text-sm text-muted-foreground font-display uppercase tracking-wider border border-border p-3 text-center">
              Message the seller to unlock the download
            </p>
          )}

          {listing.description && (
            <p className="mt-6 text-foreground whitespace-pre-wrap">{listing.description}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {listing.accepts_cash && (
              <span className="px-2 py-0.5 border border-border font-display uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="h-3 w-3" />Cash
              </span>
            )}
            {listing.accepts_external_payment && (
              <span className="px-2 py-0.5 border border-border font-display uppercase tracking-wider">Venmo/PayPal</span>
            )}
          </div>

          {/* Seller card */}
          <Card className="mt-6 rounded-none border-foreground">
            <CardContent className="flex items-center gap-4 p-4">
              <Link to={`/users/${listing.seller_id}`}>
                <Avatar className="h-12 w-12 rounded-none">
                  <AvatarImage src={seller?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-display rounded-none">{sellerInitials}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1">
                <Link to={`/users/${listing.seller_id}`} className="font-display font-bold uppercase tracking-wide text-sm text-primary/80 hover:text-primary underline decoration-primary/0 hover:decoration-primary/60 underline-offset-2 transition-all">
                  {seller?.display_name || "Seller"}
                </Link>
                {sellerRating.count > 0 && (
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    {sellerRating.avg} ({sellerRating.count} review{sellerRating.count !== 1 ? "s" : ""})
                  </p>
                )}
                {storefrontSlug && (
                  <Link
                    to={`/store/${storefrontSlug}`}
                    className="flex items-center gap-1 text-xs text-primary hover:underline font-display uppercase tracking-wider mt-0.5"
                  >
                    <Store className="h-3 w-3" />Visit Store
                  </Link>
                )}
              </div>
              {!isOwnListing && (
                <Button onClick={handleContact} size="sm" className="rounded-none font-display uppercase tracking-wider">
                  <MessageSquare className="mr-1 h-4 w-4" />Message
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
