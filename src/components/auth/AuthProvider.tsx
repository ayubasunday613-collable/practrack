import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  profileLoading: boolean;
  session: Session | null;
  profile: Profile | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const configured = isSupabaseConfigured();
  const client = getSupabaseClient();

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return;
    }

    let active = true;
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });

    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error("Could not read the current Supabase session.", error);
        setSession(data.session);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    if (!client || !session) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    let active = true;
    setProfileLoading(true);
    void client
      .from("profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Could not load the signed-in user's profile.", error);
          setProfile(null);
        } else {
          setProfile(data);
        }
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client, session]);

  const signOut = async () => {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{ configured, loading, profileLoading, session, profile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
