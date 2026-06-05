import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MapPin } from "lucide-react";

export default function ProfileSetup() {
  const { user, profile, refreshProfile } = useAuth();
  const profileWithVerification = profile as typeof profile & {
    neighborhood_area?: string | null;
    neighborhood_verification_note?: string | null;
    neighborhood_verification_status?: string | null;
  };
  const [neighborhoodArea, setNeighborhoodArea] = useState(profileWithVerification?.neighborhood_area || "");
  const [zipCode, setZipCode] = useState(profile?.zip_code || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [verificationNote, setVerificationNote] = useState(profileWithVerification?.neighborhood_verification_note || "");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    setNeighborhoodArea(profileWithVerification?.neighborhood_area || "");
    setZipCode(profile?.zip_code || "");
    setBio(profile?.bio || "");
    setDisplayName(profile?.display_name || "");
    setVerificationNote(profileWithVerification?.neighborhood_verification_note || "");
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const cleanZip = zipCode.trim();
    const cleanArea = neighborhoodArea.trim();
    const cleanName = displayName.trim();
    const cleanBio = bio.trim();
    const cleanVerification = verificationNote.trim();

    if (!/^\d{5}(-\d{4})?$/.test(cleanZip)) {
      toast({ title: "Invalid ZIP", description: "Enter a valid 5-digit ZIP code.", variant: "destructive" });
      return;
    }
    if (!cleanName || cleanName.length > 80) {
      toast({ title: "Invalid name", description: "Display name must be 1–80 characters.", variant: "destructive" });
      return;
    }
    if (cleanArea.length > 80) {
      toast({ title: "Too long", description: "Keep your neighborhood or area under 80 characters.", variant: "destructive" });
      return;
    }
    if (cleanBio.length > 500 || cleanVerification.length > 300) {
      toast({ title: "Too long", description: "Keep your bio and verification note shorter.", variant: "destructive" });
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        zip_code: cleanZip,
        neighborhood_area: cleanArea || null,
        bio: cleanBio || null,
        display_name: cleanName,
        neighborhood_verification_note: cleanVerification || null,
        neighborhood_verification_status: cleanVerification ? "pending" : profileWithVerification?.neighborhood_verification_status || "unverified",
      } as any)
      .eq("user_id", user.id);

    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Profile updated!" });
      navigate("/");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-display text-2xl">Set up your profile</CardTitle>
          <CardDescription>Tell your neighbors who you are</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={displayName} onChange={e => setDisplayName(e.target.value)} required maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">Zip code</Label>
              <Input id="zip" value={zipCode} onChange={e => setZipCode(e.target.value)} required placeholder="e.g. 90210" maxLength={10} />
              <p className="text-xs text-muted-foreground">This helps show you listings nearby</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="neighborhood-area">Neighborhood / area</Label>
              <Input
                id="neighborhood-area"
                value={neighborhoodArea}
                onChange={e => setNeighborhoodArea(e.target.value)}
                placeholder="e.g. Old Town, East Main, Ward 3"
                maxLength={80}
              />
              <p className="text-xs text-muted-foreground">Invite testers can save the specific part of town they are testing from.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio (optional)</Label>
              <Textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell your community a bit about yourself..." rows={3} maxLength={500} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verification">Neighborhood verification (optional)</Label>
              <Textarea
                id="verification"
                value={verificationNote}
                onChange={e => setVerificationNote(e.target.value)}
                placeholder="Nearest cross street, local landmark, or what part of the neighborhood you’re testing from..."
                rows={3}
                maxLength={300}
              />
              <p className="text-xs text-muted-foreground">Invite testers can use this to confirm they belong to the neighborhood they are testing.</p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Complete setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
