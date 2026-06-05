import {
  Leaf,
  Cake,
  Paintbrush,
  Wrench,
  ChefHat,
  Shirt,
  Home,
  FileDown,
  Package,
  Beef,
  type LucideIcon,
} from "lucide-react";

export interface Guild {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const GUILDS: Guild[] = [
  { key: "produce", label: "The Grower", description: "Farms, gardens & fresh produce", icon: Leaf },
  { key: "butcher", label: "The Butcher", description: "Meats, fish & animal products", icon: Beef },
  { key: "baked_goods", label: "The Baker", description: "Bread, pastries & baked goods", icon: Cake },
  { key: "crafts", label: "The Maker", description: "Handmade crafts, woodwork & pottery", icon: Paintbrush },
  { key: "services", label: "The Fixer", description: "Repairs, handyman & odd jobs", icon: Wrench },
  { key: "prepared_foods", label: "The Cook", description: "Prepared meals, preserves & sauces", icon: ChefHat },
  { key: "clothing", label: "The Tailor", description: "Clothing, alterations & textiles", icon: Shirt },
  { key: "home_goods", label: "The Keeper", description: "Home goods, furniture & decor", icon: Home },
  { key: "digital_goods", label: "The Scribe", description: "Digital goods, designs & templates", icon: FileDown },
  { key: "other", label: "The Trader", description: "Everything else", icon: Package },
];

export const GUILD_MAP = new Map(GUILDS.map((g) => [g.key, g]));

export function getGuild(category: string): Guild {
  return GUILD_MAP.get(category) || GUILDS[GUILDS.length - 1];
}
