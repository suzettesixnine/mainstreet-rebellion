import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md border-foreground/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="font-display text-2xl uppercase tracking-wider">Reset password</CardTitle>
          <CardDescription>
            {sent ? "Check your email for a reset link" : "Enter your email and we'll send you a reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                If an account exists for <strong>{email}</strong>, you'll receive a password reset email shortly.
              </p>
              <Button variant="outline" className="w-full uppercase tracking-wider font-display" asChild>
                <Link to="/login">Back to login</Link>
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="uppercase tracking-wider text-xs font-display">Email</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" className="rounded-none" />
                </div>
                <Button type="submit" className="w-full uppercase tracking-wider font-display" disabled={loading}>
                  {loading ? "Sending..." : "Send reset link"}
                </Button>
              </form>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                <Link to="/login" className="font-medium text-primary hover:underline">Back to login</Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
