import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Camera, Crown, Zap, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { TIER_LIMITS } from "@/lib/tiers";
import StorefrontEditor from "@/components/StorefrontEditor";
import ProfilePhotoEditor from "@/components/ProfilePhotoEditor";

export default function Profile() {
  const { user, profile, sellerTier, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [bio, setBio] = useState("");
  const [venmo, setVenmo] = useState("");
  const [paypal, setPaypal] = useState("");
  const [cashapp, setCashapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [storefrontSlug, setStorefrontSlug] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setZipCode(profile.zip_code || "");
      setBio(profile.bio || "");
      setVenmo(profile.payment_venmo || "");
      setPaypal(profile.payment_paypal || "");
      setCashapp(profile.payment_cashapp || "");
    }
    if (user) {
      supabase.from("storefronts").select("slug").eq("user_id", user.id).single()
        .then(({ data }) => setStorefrontSlug(data?.slug ?? null));
    }
  }, [profile, user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
    await refreshProfile();
    setUploading(false);
    toast({ title: "Avatar updated!" });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName,
      zip_code: zipCode,
      bio,
      payment_venmo: venmo || null,
      payment_paypal: paypal || null,
      payment_cashapp: cashapp || null,
    }).eq("user_id", user.id);
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Profile saved!" });
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated!" });
    }
  };

  const initials = displayName ? displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  // 🏘️ Verification badge — proof you're really from the block
  const profileExt = profile as typeof profile & {
    neighborhood_area?: string | null;
    neighborhood_verification_status?: string | null;
    neighborhood_verification_note?: string | null;
  };
  const verificationStatus = profileExt?.neighborhood_verification_status || "unverified";
  const neighborhoodArea = profileExt?.neighborhood_area || "";
  const verificationVariant: "default" | "secondary" | "outline" =
    verificationStatus === "verified" ? "default" : verificationStatus === "pending" ? "secondary" : "outline";
  const verificationLabel =
    verificationStatus === "verified" ? "Verified" : verificationStatus === "pending" ? "Pending review" : "Unverified";

  return (
    <div className="container max-w-2xl py-12 px-4 animate-fade-in">
      <h1 className="font-display text-4xl md:text-5xl font-bold uppercase tracking-tighter mb-8 text-foreground">Profile</h1>
      <Card className="border-foreground/20">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-foreground text-background text-lg font-display">{initials}</AvatarFallback>
              </Avatar>
              <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90">
                <Camera className="h-3.5 w-3.5" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
              </label>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="font-display uppercase tracking-wider">{displayName || "Your Name"}</CardTitle>
                {sellerTier === "seller" && (
                  <Badge className="rounded-none uppercase tracking-wider text-xs font-display bg-primary text-primary-foreground px-2">
                    <Zap className="h-3 w-3 mr-1" />Seller
                  </Badge>
                )}
                {sellerTier === "pro" && (
                  <Badge className="rounded-none uppercase tracking-wider text-xs font-display bg-foreground text-background px-2">
                    <Crown className="h-3 w-3 mr-1" />Pro
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Button variant="link" size="sm" className="px-0 text-xs font-display uppercase tracking-wider text-primary" asChild>
                <Link to="/pricing">{sellerTier === "free" ? "Upgrade plan" : "Manage plan"}</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 🏘️ Where you rep + verification status */}
          <div className="mb-6 border border-foreground/20 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="uppercase tracking-wider text-xs font-display text-muted-foreground">Neighborhood</p>
              <p className="font-display font-bold text-foreground">
                {neighborhoodArea || <span className="text-muted-foreground font-normal">Not set</span>}
              </p>
              {profileExt?.neighborhood_verification_note && (
                <p className="text-xs text-muted-foreground mt-1 italic">"{profileExt.neighborhood_verification_note}"</p>
              )}
            </div>
            <Badge variant={verificationVariant} className="rounded-none uppercase tracking-wider text-xs font-display">
              {verificationLabel}
            </Badge>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="uppercase tracking-wider text-xs font-display">Display name</Label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} required className="rounded-none border-foreground/30" />
              </div>
              <div className="space-y-2">
                <Label className="uppercase tracking-wider text-xs font-display">Zip code</Label>
                <Input value={zipCode} onChange={e => setZipCode(e.target.value)} required maxLength={10} className="rounded-none border-foreground/30" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="uppercase tracking-wider text-xs font-display">Bio</Label>
              <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="rounded-none border-foreground/30" />
            </div>
            <div className="border-t border-border pt-4 mt-4">
              <h3 className="font-display font-bold uppercase tracking-wider text-sm mb-3 text-foreground">Payment links</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label className="uppercase tracking-wider text-xs font-display">Venmo</Label>
                  <Input value={venmo} onChange={e => setVenmo(e.target.value)} placeholder="@username" className="rounded-none border-foreground/30" />
                </div>
                <div className="space-y-2">
                  <Label className="uppercase tracking-wider text-xs font-display">PayPal</Label>
                  <Input value={paypal} onChange={e => setPaypal(e.target.value)} placeholder="paypal.me/..." className="rounded-none border-foreground/30" />
                </div>
                <div className="space-y-2">
                  <Label className="uppercase tracking-wider text-xs font-display">Cash App</Label>
                  <Input value={cashapp} onChange={e => setCashapp(e.target.value)} placeholder="$cashtag" className="rounded-none border-foreground/30" />
                </div>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="uppercase tracking-wider font-display text-xs">
              {loading ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {storefrontSlug && (
        <div className="mt-6">
          <Button variant="outline" className="w-full rounded-none font-display uppercase tracking-wider text-xs border-foreground/30" asChild>
            <Link to={`/store/${storefrontSlug}`}>
              <Store className="mr-2 h-4 w-4" />Visit your store
            </Link>
          </Button>
        </div>
      )}

      <ProfilePhotoEditor />

      <StorefrontEditor />

      <Card className="border-foreground/20 mt-6">
        <CardHeader>
          <CardTitle className="font-display uppercase tracking-wider text-sm">Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label className="uppercase tracking-wider text-xs font-display">New password</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} placeholder="Min 6 characters" className="rounded-none border-foreground/30" />
            </div>
            <div className="space-y-2">
              <Label className="uppercase tracking-wider text-xs font-display">Confirm new password</Label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} placeholder="Re-enter password" className="rounded-none border-foreground/30" />
            </div>
            <Button type="submit" disabled={changingPassword} className="uppercase tracking-wider font-display text-xs">
              {changingPassword ? "Updating..." : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
