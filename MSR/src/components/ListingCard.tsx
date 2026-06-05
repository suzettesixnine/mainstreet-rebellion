import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, FileDown, Zap, Crown } from "lucide-react";
import { getGuild } from "@/lib/guilds";
import type { Tables } from "@/integrations/supabase/types";

interface ListingCardProps {
  listing: Tables<"listings"> & {
    profiles?: { display_name: string | null; avatar_url: string | null } | null;
    seller_tier?: string | null;
  };
}

export default function ListingCard({ listing }: ListingCardProps) {
  const mainImage = listing.images?.[0];
  const guild = getGuild(listing.category);

  return (
    <Link to={`/listings/${listing.id}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg border-border hover:border-foreground">
        <div className="aspect-square overflow-hidden bg-muted">
          {mainImage ? (
            <img
              src={mainImage}
              alt={listing.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <span className="font-display text-2xl uppercase tracking-wider opacity-30">MSR</span>
            </div>
          )}
        </div>
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display font-medium text-sm leading-tight line-clamp-2 text-foreground uppercase tracking-wide">{listing.title}</h3>
            <span className="font-display font-bold text-primary whitespace-nowrap">
              ${Number(listing.price).toFixed(2)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-xs px-1.5 py-0 uppercase tracking-wider">
              {guild.label}
            </Badge>
            {(listing as any).is_digital && (
              <Badge className="text-xs px-1.5 py-0 bg-accent text-accent-foreground uppercase tracking-wider">
                <FileDown className="mr-0.5 h-3 w-3" />Digital
              </Badge>
            )}
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {listing.zip_code}
            </span>
          </div>
          {listing.profiles?.display_name && (
            <p className="mt-1.5 text-xs text-muted-foreground truncate flex items-center gap-1">
              by{" "}
              <Link
                to={`/users/${listing.seller_id}`}
                className="font-medium text-primary/80 hover:text-primary underline decoration-primary/0 hover:decoration-primary/60 underline-offset-2 transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                {listing.profiles.display_name}
              </Link>
              {listing.seller_tier === "seller" && <Zap className="h-3 w-3 text-primary" />}
              {listing.seller_tier === "pro" && <Crown className="h-3 w-3 text-primary" />}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
