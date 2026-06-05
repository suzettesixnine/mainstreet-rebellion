import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, ShieldX, MapPin, Loader2 } from "lucide-react";

// 🕵️ Admin HQ — where pending neighborhoods get the rubber stamp (or the boot)
type PendingProfile = {
  id: string;
  user_id: string;
  display_name: string | null;
  zip_code: string | null;
  neighborhood_area: string | null;
  neighborhood_verification_note: string | null;
  neighborhood_verification_status: string | null;
  neighborhood_review_note: string | null;
  invited_reason: string | null;
  created_at: string;
};

export default function AdminVerifications() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [checkingRole, setCheckingRole] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [profiles, setProfiles] = useState<PendingProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"pending" | "verified" | "rejected" | "all">("pending");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCheckingRole(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "moderator"]);
      setAllowed((data?.length ?? 0) > 0);
      setCheckingRole(false);
    })();
  }, [user]);

  const fetchProfiles = async () => {
    setLoading(true);
    let query: any = supabase
      .from("profiles")
      .select("id, user_id, display_name, zip_code, neighborhood_area, neighborhood_verification_note, neighborhood_verification_status, neighborhood_review_note, invited_reason, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter !== "all") {
      query = query.eq("neighborhood_verification_status", filter);
    }
    const { data, error } = await query;
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    } else {
      setProfiles((data ?? []) as PendingProfile[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (allowed) void fetchProfiles();
  }, [allowed, filter]);

  const decide = async (p: PendingProfile, status: "verified" | "rejected") => {
    if (!user) return;
    setBusyId(p.id);
    const { error } = await supabase
      .from("profiles")
      .update({
        neighborhood_verification_status: status,
        neighborhood_review_note: reviewNotes[p.id]?.trim() || null,
        neighborhood_reviewed_by: user.id,
        neighborhood_reviewed_at: new Date().toISOString(),
      } as any)
      .eq("id", p.id);
    setBusyId(null);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: status === "verified" ? "Approved ✅" : "Rejected ❌" });
    setReviewNotes((s) => ({ ...s, [p.id]: "" }));
    void fetchProfiles();
  };

  if (authLoading || checkingRole) {
    return <div className="container py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!allowed) {
    return (
      <div className="container max-w-2xl py-16 text-center">
        <h1 className="font-display text-3xl uppercase tracking-tighter mb-2">Access denied</h1>
        <p className="text-muted-foreground">You need an admin or moderator role to view this page.</p>
      </div>
    );
  }

  const statusVariant = (s: string | null): "default" | "secondary" | "outline" | "destructive" =>
    s === "verified" ? "default" : s === "pending" ? "secondary" : s === "rejected" ? "destructive" : "outline";

  return (
    <div className="container max-w-4xl py-12 px-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-4xl md:text-5xl font-bold uppercase tracking-tighter">Verifications</h1>
        <div className="flex gap-2 flex-wrap">
          {(["pending", "verified", "rejected", "all"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="rounded-none uppercase tracking-wider font-display text-xs"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : profiles.length === 0 ? (
        <Card className="border-foreground/20"><CardContent className="py-10 text-center text-muted-foreground">No profiles in this bucket. 🍂</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {profiles.map((p) => (
            <Card key={p.id} className="border-foreground/20">
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="font-display uppercase tracking-wider text-base">
                    {p.display_name || "Unnamed neighbor"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {p.neighborhood_area || "—"} · {p.zip_code || "no zip"}
                  </p>
                </div>
                <Badge variant={statusVariant(p.neighborhood_verification_status)} className="rounded-none uppercase tracking-wider text-xs font-display">
                  {p.neighborhood_verification_status || "unverified"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.invited_reason && (
                  <div>
                    <p className="uppercase tracking-wider text-xs font-display text-muted-foreground mb-1">Invite reason</p>
                    <p className="text-sm">{p.invited_reason}</p>
                  </div>
                )}
                <div>
                  <p className="uppercase tracking-wider text-xs font-display text-muted-foreground mb-1">Their proof</p>
                  <p className="text-sm italic">{p.neighborhood_verification_note || <span className="text-muted-foreground not-italic">— no note submitted —</span>}</p>
                </div>
                {p.neighborhood_review_note && (
                  <div>
                    <p className="uppercase tracking-wider text-xs font-display text-muted-foreground mb-1">Previous review note</p>
                    <p className="text-sm">{p.neighborhood_review_note}</p>
                  </div>
                )}
                <div className="space-y-2 pt-2 border-t border-border">
                  <Textarea
                    value={reviewNotes[p.id] || ""}
                    onChange={(e) => setReviewNotes((s) => ({ ...s, [p.id]: e.target.value }))}
                    placeholder="Optional review note (visible to the user later)..."
                    rows={2}
                    maxLength={500}
                    className="rounded-none border-foreground/30"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => decide(p, "verified")}
                      disabled={busyId === p.id}
                      size="sm"
                      className="uppercase tracking-wider font-display text-xs"
                    >
                      <ShieldCheck className="mr-1 h-4 w-4" /> Approve
                    </Button>
                    <Button
                      onClick={() => decide(p, "rejected")}
                      disabled={busyId === p.id}
                      size="sm"
                      variant="destructive"
                      className="uppercase tracking-wider font-display text-xs rounded-none"
                    >
                      <ShieldX className="mr-1 h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
