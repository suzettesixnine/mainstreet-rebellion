import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Flame, Loader2, MapPin, ShieldAlert, ShieldCheck, Store, Users } from "lucide-react";

type InviteDetails = {
  id: string;
  email: string | null;
  invitedBy: string | null;
  reason: string;
  zipCode: string | null;
  expiresAt: string;
};

type InviteResponse = {
  valid: boolean;
  status: "pending" | "accepted" | "expired" | "invalid" | string;
  invite: InviteDetails | null;
  error?: string;
};

export default function InviteLanding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = useMemo(() => searchParams.get("token")?.trim() || "", [searchParams]);
  const fallbackFrom = searchParams.get("from")?.trim().slice(0, 80) || "a Mainstreet Rebellion neighbor";
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [status, setStatus] = useState<InviteResponse["status"]>(token ? "pending" : "invalid");
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    let active = true;

    const validateInvite = async () => {
      if (!token) {
        setLoading(false);
        setStatus("invalid");
        return;
      }

      setLoading(true);
      const { data, error } = await supabase.functions.invoke<InviteResponse>("validate-invite", {
        body: { token },
      });

      if (!active) return;
      setLoading(false);

      if (error || !data) {
        setStatus("invalid");
        toast({ title: "Invite check failed", description: "This invite link could not be verified.", variant: "destructive" });
        return;
      }

      setStatus(data.status);
      setInvite(data.valid ? data.invite : null);
    };

    void validateInvite();
    return () => {
      active = false;
    };
  }, [token, toast]);

  const invitedBy = invite?.invitedBy || fallbackFrom;
  const reason = invite?.reason || "You were invited to help test Mainstreet Rebellion in your neighborhood before it opens wider.";
  const canContinue = status === "pending" && invite;

  const continueToSignup = () => {
    if (!canContinue) return;

    const params = new URLSearchParams({
      invite_token: token,
      from: invitedBy,
      reason,
    });

    if (invite.email) params.set("email", invite.email);
    if (invite.zipCode) params.set("zip", invite.zipCode);

    navigate(`/signup?${params.toString()}`);
  };

  return (
    <div className="container px-4 py-12 animate-fade-in">
      <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
        <section className="pt-6">
          <div className="mb-8 flex items-center gap-2 text-primary">
            <Flame className="h-6 w-6" />
            <span className="font-display text-sm font-bold uppercase tracking-wider">Mainstreet Rebellion Invite</span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold uppercase tracking-tighter text-foreground leading-[0.9]">
            You&apos;re invited to test your street.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            {invitedBy} invited you to help shape a neighborhood marketplace where locals can find the growers, bakers, makers, fixers, and neighbors their street is missing.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="border-2 border-foreground p-4">
              <MapPin className="mb-3 h-6 w-6 text-primary" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wider">Verify your block</h2>
              <p className="mt-1 text-sm text-muted-foreground">Signup asks for ZIP and a quick local cue so testing stays neighborhood-first.</p>
            </div>
            <div className="border-2 border-foreground p-4">
              <Store className="mb-3 h-6 w-6 text-primary" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wider">Test the market</h2>
              <p className="mt-1 text-sm text-muted-foreground">Browse listings, message sellers, and spot what your street needs next.</p>
            </div>
            <div className="border-2 border-foreground p-4">
              <Users className="mb-3 h-6 w-6 text-primary" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wider">Build feedback</h2>
              <p className="mt-1 text-sm text-muted-foreground">Post suggestions, join events, and help us get ready for wider testing.</p>
            </div>
          </div>
        </section>

        <Card className="rounded-none border-2 border-foreground shadow-none">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center border-2 border-primary text-primary">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : canContinue ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            </div>
            <CardTitle className="font-display text-2xl uppercase tracking-wider">Invite Check</CardTitle>
            <CardDescription>{loading ? "Verifying your invite link." : canContinue ? "Your tester invite is ready." : "This invite cannot be used."}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="border-2 border-foreground/20 p-4 text-sm text-muted-foreground">Checking token…</div>
            ) : canContinue ? (
              <div className="space-y-4">
                <div className="border-2 border-foreground p-4">
                  <p className="font-display text-xs font-bold uppercase tracking-wider text-primary">Why you&apos;re invited</p>
                  <p className="mt-2 text-sm text-foreground">{reason}</p>
                  {invite.zipCode && <p className="mt-3 text-sm text-muted-foreground">Neighborhood focus: {invite.zipCode}</p>}
                </div>
                <Button onClick={continueToSignup} className="w-full rounded-none font-display uppercase tracking-wider">
                  Continue to signup
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border-2 border-destructive p-4 text-sm text-muted-foreground">
                  {status === "expired" && "This invite has expired. Ask for a fresh tester link."}
                  {status === "accepted" && "This invite has already been accepted."}
                  {(status === "invalid" || !["expired", "accepted"].includes(String(status))) && "This invite link is missing or invalid."}
                </div>
                <Button asChild variant="outline" className="w-full rounded-none font-display uppercase tracking-wider">
                  <Link to="/">Back to home</Link>
                </Button>
              </div>
            )}
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Log in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
