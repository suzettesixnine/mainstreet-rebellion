import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Eye, MessageSquare, Star, Package } from "lucide-react";
import DashboardAnalytics from "@/components/DashboardAnalytics";
import type { Tables } from "@/integrations/supabase/types";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-success text-primary-foreground",
  reserved: "bg-warning text-foreground",
  sold: "bg-muted text-muted-foreground",
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [listings, setListings] = useState<Tables<"listings">[]>([]);
  const [reviews, setReviews] = useState<Tables<"reviews">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    const fetch = async () => {
      const [{ data: l }, { data: r }] = await Promise.all([
        supabase.from("listings").select("*").eq("seller_id", user.id).order("created_at", { ascending: false }),
        supabase.from("reviews").select("*").eq("seller_id", user.id).order("created_at", { ascending: false }),
      ]);
      setListings(l || []);
      setReviews(r || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("listings").update({ status: status as any }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setListings(prev => prev.map(l => l.id === id ? { ...l, status: status as any } : l));
  };

  const activeCount = listings.filter(l => l.status === "active").length;
  const soldCount = listings.filter(l => l.status === "sold").length;
  const totalViews = listings.reduce((a, l) => a + l.view_count, 0);
  const avgRating = reviews.length > 0
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  if (loading) return <div className="container py-16 text-center text-muted-foreground font-display uppercase tracking-wider">Loading...</div>;

  return (
    <div className="container py-12 px-4 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-4xl md:text-5xl font-bold uppercase tracking-tighter text-foreground">Dashboard</h1>
        <Button asChild className="uppercase tracking-wider font-display text-xs">
          <Link to="/listings/new"><Plus className="mr-1 h-4 w-4" />New listing</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Active", value: activeCount, icon: Package },
          { label: "Sold", value: soldCount, icon: Package },
          { label: "Total Views", value: totalViews, icon: Eye },
          { label: "Avg Rating", value: avgRating, icon: Star },
        ].map(stat => (
          <Card key={stat.label} className="border-foreground/20">
            <CardContent className="flex items-center gap-3 p-4">
              <stat.icon className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold font-display">{stat.value}</p>
                <p className="text-xs text-muted-foreground font-display uppercase tracking-wider">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Listings */}
      <h2 className="font-display text-xl font-bold mb-4 uppercase tracking-wider text-foreground">Your listings</h2>
      {listings.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border">
          <p className="font-display uppercase tracking-wider text-muted-foreground">You haven't listed anything yet.</p>
          <Button className="mt-4 uppercase tracking-wider font-display text-xs" asChild>
            <Link to="/listings/new">Create your first listing</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map(listing => (
            <Card key={listing.id} className="flex items-center gap-4 p-4 border-foreground/10">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden bg-muted">
                {listing.images?.[0] ? (
                  <img src={listing.images[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground"><Package className="h-6 w-6" /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/listings/${listing.id}`} className="font-display font-medium text-sm hover:underline truncate block uppercase tracking-wider">{listing.title}</Link>
                <p className="text-sm text-primary font-bold font-display">${Number(listing.price).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{listing.view_count} views · Qty: {listing.quantity}</p>
              </div>
              <Select value={listing.status} onValueChange={v => updateStatus(listing.id, v)}>
                <SelectTrigger className="w-28 rounded-none border-foreground font-display uppercase tracking-wider text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active" className="font-display uppercase tracking-wider text-xs">Active</SelectItem>
                  <SelectItem value="reserved" className="font-display uppercase tracking-wider text-xs">Reserved</SelectItem>
                  <SelectItem value="sold" className="font-display uppercase tracking-wider text-xs">Sold</SelectItem>
                </SelectContent>
              </Select>
            </Card>
          ))}
        </div>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <>
          <h2 className="font-display text-xl font-bold mt-10 mb-4 uppercase tracking-wider text-foreground">Reviews</h2>
          <div className="space-y-3">
            {reviews.map(review => (
              <Card key={review.id} className="p-4 border-foreground/10">
                <div className="flex items-center gap-1 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < review.rating ? "fill-warning text-warning" : "text-muted"}`} />
                  ))}
                </div>
                {review.comment && <p className="text-sm text-foreground">{review.comment}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(review.created_at).toLocaleDateString()}
                </p>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Analytics Charts */}
      <DashboardAnalytics listings={listings} />
    </div>
  );
}
