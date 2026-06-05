import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Crown, ExternalLink, ImagePlus } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StorefrontEditor() {
  const { user, sellerTier } = useAuth();
  const { toast } = useToast();
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [hours, setHours] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const { data: storefront, refetch } = useQuery({
    queryKey: ["my-storefront", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("storefronts")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user?.id && sellerTier === "pro",
  });

  useEffect(() => {
    if (storefront) {
      setSlug(storefront.slug || "");
      setTagline(storefront.tagline || "");
      setHours((storefront.operating_hours as Record<string, string>) ?? {});
    }
  }, [storefront]);

  if (sellerTier !== "pro") {
    return (
      <Card className="border-foreground/20 mt-6">
        <CardHeader>
          <CardTitle className="font-display uppercase tracking-wider text-sm flex items-center gap-2">
            <Crown className="h-4 w-4" /> Storefront
            <Badge variant="secondary" className="text-xs uppercase tracking-wider rounded-none">Pro</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Get a dedicated storefront page with custom branding, banner, and operating hours.
          </p>
          <Button variant="outline" size="sm" className="uppercase tracking-wider font-display text-xs" asChild>
            <Link to="/pricing">Upgrade to Pro</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingBanner(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/banner.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploadingBanner(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

    if (storefront) {
      await supabase.from("storefronts").update({ banner_url: publicUrl }).eq("user_id", user.id);
    }
    await refetch();
    setUploadingBanner(false);
    toast({ title: "Banner updated!" });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !slug.trim()) return;

    const sanitizedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    setSaving(true);

    const payload = {
      user_id: user.id,
      slug: sanitizedSlug,
      tagline: tagline || null,
      operating_hours: hours,
    };

    let error;
    if (storefront) {
      ({ error } = await supabase.from("storefronts").update(payload).eq("user_id", user.id));
    } else {
      ({ error } = await supabase.from("storefronts").insert(payload));
    }

    setSaving(false);
    if (error) {
      const msg = error.message.includes("unique") ? "That URL slug is already taken." : error.message;
      toast({ title: "Error", description: msg, variant: "destructive" });
    } else {
      setSlug(sanitizedSlug);
      await refetch();
      toast({ title: "Storefront saved!" });
    }
  };

  const updateHour = (day: string, value: string) => {
    setHours((prev) => ({ ...prev, [day]: value }));
  };

  return (
    <Card className="border-foreground/20 mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-display uppercase tracking-wider text-sm flex items-center gap-2">
            <Crown className="h-4 w-4" /> Storefront settings
          </CardTitle>
          {storefront && (
            <Button variant="link" size="sm" className="px-0 text-xs font-display uppercase tracking-wider text-primary" asChild>
              <Link to={`/store/${storefront.slug}`}>
                <ExternalLink className="h-3 w-3 mr-1" />Visit store
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          {/* Banner upload */}
          <div className="space-y-2">
            <Label className="uppercase tracking-wider text-xs font-display">Banner image</Label>
            <div className="relative h-32 rounded-sm overflow-hidden bg-muted border border-border">
              {storefront?.banner_url ? (
                <img src={storefront.banner_url} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No banner set</div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-foreground/0 hover:bg-foreground/20 cursor-pointer transition-colors">
                <ImagePlus className="h-6 w-6 text-background opacity-0 hover:opacity-100 transition-opacity" />
                <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={uploadingBanner} />
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="uppercase tracking-wider text-xs font-display">Store URL slug</Label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">/store/</span>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  placeholder="my-shop"
                  className="rounded-none border-foreground/30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="uppercase tracking-wider text-xs font-display">Tagline</Label>
              <Input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Fresh from the garden"
                className="rounded-none border-foreground/30"
              />
            </div>
          </div>

          {/* Operating hours */}
          <div className="space-y-2">
            <Label className="uppercase tracking-wider text-xs font-display">Operating hours</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {DAY_LABELS.map((day) => (
                <div key={day} className="flex items-center gap-2">
                  <span className="text-xs font-medium w-8 text-foreground">{day}</span>
                  <Input
                    value={hours[day] || ""}
                    onChange={(e) => updateHour(day, e.target.value)}
                    placeholder="9am–5pm"
                    className="rounded-none border-foreground/30 text-xs h-8"
                  />
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={saving} className="uppercase tracking-wider font-display text-xs">
            {saving ? "Saving…" : storefront ? "Update storefront" : "Create storefront"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
