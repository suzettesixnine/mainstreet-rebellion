import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Flame } from "lucide-react";

const signupSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(80, "Display name must be under 80 characters"),
  email: z.string().trim().email("Enter a valid email").max(255, "Email must be under 255 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").max(72, "Password must be under 72 characters"),
  neighborhoodArea: z.string().trim().optional(),
  zipCode: z.string().trim().optional(),
  verificationNote: z.string().trim().optional(),
}).superRefine((values, ctx) => {
  if (values.neighborhoodArea && (values.neighborhoodArea.length < 2 || values.neighborhoodArea.length > 80)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["neighborhoodArea"], message: "Keep neighborhood or area between 2 and 80 characters" });
  }
  if (values.zipCode && !/^\d{5}(-\d{4})?$/.test(values.zipCode)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["zipCode"], message: "Enter a valid ZIP code" });
  }
  if (values.verificationNote && (values.verificationNote.length < 10 || values.verificationNote.length > 300)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["verificationNote"], message: "Keep neighborhood verification between 10 and 300 characters" });
  }
});

export default function Signup() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite_token")?.trim() || "";
  const inviteFrom = searchParams.get("from")?.trim().slice(0, 80) || "";
  const inviteReason = searchParams.get("reason")?.trim().slice(0, 240) || "";
  const inviteZip = searchParams.get("zip")?.trim().slice(0, 10) || "";
  const inviteEmail = searchParams.get("email")?.trim().slice(0, 255) || "";
  const hasInvite = Boolean(inviteToken);

  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [neighborhoodArea, setNeighborhoodArea] = useState("");
  const [zipCode, setZipCode] = useState(inviteZip);
  const [verificationNote, setVerificationNote] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    setEmail(inviteEmail);
    setZipCode(inviteZip);
  }, [inviteEmail, inviteZip]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ displayName, email, password, neighborhoodArea, zipCode, verificationNote });
    if (!parsed.success) {
      toast({ title: "Check your signup", description: parsed.error.issues[0]?.message, variant: "destructive" });
      return;
    }

    const values = parsed.data;
    if (hasInvite && (!values.neighborhoodArea || !values.zipCode || !values.verificationNote)) {
      toast({ title: "Neighborhood verification required", description: "Add your area, ZIP, and a quick local cue to accept this invite.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: values.email.toLowerCase(),
      password: values.password,
      options: {
        data: {
          display_name: values.displayName,
          neighborhood_area: values.neighborhoodArea || undefined,
          zip_code: values.zipCode || undefined,
          neighborhood_verification_note: values.verificationNote || undefined,
          invited_reason: inviteReason || (inviteFrom ? `Invited by ${inviteFrom} to test Mainstreet Rebellion` : undefined),
          invite_token: inviteToken || undefined,
        },
        emailRedirectTo: `${window.location.origin}/profile/setup`,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account created!", description: hasInvite ? "Invite accepted. Please complete your profile." : "Please complete your profile." });
      navigate("/profile/setup");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md border-foreground/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center">
            <Flame className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="font-display text-2xl uppercase tracking-wider">Join the Rebellion</CardTitle>
          <CardDescription>{hasInvite ? "Create your tester account and verify your neighborhood" : "Create your account to buy and sell locally"}</CardDescription>
        </CardHeader>
        <CardContent>
          {hasInvite && (
            <div className="mb-4 border border-primary/40 bg-primary/5 p-3 text-sm text-muted-foreground">
              <p>You were invited{inviteFrom ? <> by <span className="font-medium text-foreground">{inviteFrom}</span></> : ""}.</p>
              {inviteReason && <p className="mt-2 text-foreground">{inviteReason}</p>}
            </div>
          )}
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="uppercase tracking-wider text-xs font-display">Display name</Label>
              <Input id="name" value={displayName} onChange={e => setDisplayName(e.target.value)} required placeholder="Your name" className="rounded-none" maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="uppercase tracking-wider text-xs font-display">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" className="rounded-none" maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="uppercase tracking-wider text-xs font-display">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="At least 6 characters" minLength={6} maxLength={72} className="rounded-none" />
            </div>
            {hasInvite && (
              <>
                <div className="border border-foreground/20 p-3">
                  <p className="font-display text-xs font-bold uppercase tracking-wider text-primary">Neighborhood verification</p>
                  <p className="mt-1 text-sm text-muted-foreground">Confirm the area you know before your profile is completed.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="neighborhood-area" className="uppercase tracking-wider text-xs font-display">Neighborhood / area</Label>
                  <Input
                    id="neighborhood-area"
                    value={neighborhoodArea}
                    onChange={e => setNeighborhoodArea(e.target.value)}
                    required
                    placeholder="e.g. Old Town, East Main, Ward 3"
                    className="rounded-none"
                    maxLength={80}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip" className="uppercase tracking-wider text-xs font-display">Neighborhood ZIP</Label>
                  <Input id="zip" inputMode="numeric" value={zipCode} onChange={e => setZipCode(e.target.value)} required placeholder="e.g. 90210" className="rounded-none" maxLength={10} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="verification" className="uppercase tracking-wider text-xs font-display">Neighborhood verification</Label>
                  <Textarea
                    id="verification"
                    value={verificationNote}
                    onChange={e => setVerificationNote(e.target.value)}
                    required
                    placeholder="Nearest cross street, local landmark, or what part of the neighborhood you’re testing from."
                    className="min-h-[92px] rounded-none"
                    maxLength={300}
                  />
                  <p className="text-xs text-muted-foreground">This is only used to confirm testers are tied to a real neighborhood.</p>
                </div>
              </>
            )}
            <Button type="submit" className="w-full uppercase tracking-wider font-display" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">Log in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
