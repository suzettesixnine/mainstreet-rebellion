import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { SellerTier } from "@/lib/tiers";

type Profile = Tables<"profiles">;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  sellerTier: SellerTier;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  sellerTier: "free",
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sellerTier, setSellerTier] = useState<SellerTier>("free");
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    setProfile(data ?? null);
  };

  const fetchTier = async (userId: string) => {
    const { data } = await supabase
      .from("seller_tiers")
      .select("tier")
      .eq("user_id", userId)
      .single();
    setSellerTier((data?.tier as SellerTier) || "free");
  };

  const hydrateUserData = async (userId: string) => {
    await Promise.all([fetchProfile(userId), fetchTier(userId)]);
  };

  const refreshProfile = async () => {
    if (user) {
      await hydrateUserData(user.id);
    }
  };

  useEffect(() => {
    let sessionChecked = false;

    const applySession = (nextSession: Session | null) => {
      setSession(nextSession);
      const nextUser = nextSession?.user ?? null;
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setSellerTier("free");
        return;
      }

      void hydrateUserData(nextUser.id);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      applySession(nextSession);

      // Avoid early redirects on initial mount before session restore finishes.
      if (sessionChecked || event !== "INITIAL_SESSION") {
        setLoading(false);
      }
    });

    supabase.auth.getSession()
      .then(({ data, error }) => {
        sessionChecked = true;

        if (error) {
          applySession(null);
        } else {
          applySession(data.session ?? null);
        }

        setLoading(false);
      })
      .catch(() => {
        sessionChecked = true;
        applySession(null);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setSellerTier("free");
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, sellerTier, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
