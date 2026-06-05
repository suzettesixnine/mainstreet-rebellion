import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Flame } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const from = (location.state as { from?: string })?.from || "/";

  useEffect(() => {
    if (!authLoading && user) {
      navigate(from, { replace: true });
    }
  }, [authLoading, user, from, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setLoading(false);

    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate(from, { replace: true });
    }
  };

  if (authLoading) {
    return null;
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md border-foreground/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center">
            <Flame className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="font-display text-2xl uppercase tracking-wider">Welcome back</CardTitle>
          <CardDescription>Sign in to Mainstreet Rebellion</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="uppercase tracking-wider text-xs font-display">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" className="rounded-none" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="uppercase tracking-wider text-xs font-display">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="rounded-none" />
            </div>
            <Button type="submit" className="w-full uppercase tracking-wider font-display" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-3 text-center text-sm">
            <Link to="/forgot-password" className="font-medium text-primary hover:underline">Forgot password?</Link>
          </p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">Sign up</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
