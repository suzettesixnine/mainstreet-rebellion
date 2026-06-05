import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { KeyRound } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for recovery event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        setChecking(false);
      }
      // Also accept SIGNED_IN with recovery type — Supabase sometimes fires this
      // after processing the recovery token before our listener is registered
      if (event === "SIGNED_IN" && session) {
        setReady(true);
        setChecking(false);
      }
    });

    // Check hash and query params for recovery indicators
    const hash = window.location.hash;
    const search = window.location.search;
    if (hash.includes("type=recovery") || search.includes("type=recovery")) {
      setReady(true);
      setChecking(false);
    }

    // Also check if there's already an active session (token was processed before mount)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
        setChecking(false);
      }
    });

    // Give the auth state change event time to fire before showing "invalid"
    const timeout = setTimeout(() => setChecking(false), 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated!", description: "You're now signed in." });
      navigate("/", { replace: true });
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">Verifying reset link...</CardTitle>
            <CardDescription>Please wait while we verify your password reset link.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">Invalid or expired link</CardTitle>
            <CardDescription>This password reset link is no longer valid. Please request a new one.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/forgot-password")}>
              Request new reset link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-display text-2xl">Set new password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="At least 6 characters" minLength={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Re-enter password" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
