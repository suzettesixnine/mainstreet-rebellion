export type SellerTier = "free" | "seller" | "pro";

export const TIER_LIMITS = {
  free:   { maxListings: 5,  maxPhotos: 3,  featuredSlots: 0, commission: 0.10, label: "Free", price: 0 },
  seller: { maxListings: Infinity, maxPhotos: 8, featuredSlots: 1, commission: 0.08, label: "Seller", price: 12 },
  pro:    { maxListings: Infinity, maxPhotos: 15, featuredSlots: 8, commission: 0.05, label: "Pro", price: 30 },
} as const;

export const STRIPE_PRICES = {
  seller: "price_1TAOi6Bt9FRIaveJAYN4gEaS",
  pro: "price_1TAOi7Bt9FRIaveJxkO0VuTA",
} as const;

export function getTierLimits(tier: SellerTier) {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}
