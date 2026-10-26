"use client";

import * as React from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Database, UserRole } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    role: UserRole
  ) => Promise<{ error?: string; message?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string; message?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = React.useMemo(() => createClient(), []);
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(() => Boolean(supabase));

  const fetchProfile = React.useCallback(
    async (userId: string) => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (!error && data) {
          setProfile(data);
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      }
    },
    [supabase]
  );

  React.useEffect(() => {
    if (!supabase) return;

    let isMounted = true;

    // Get current session
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (isMounted) {
        setUser(user);
        if (user) {
          fetchProfile(user.id);
        }
        setIsLoading(false);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: "Supabase connection is not configured yet." };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return { error: error.message };
    }
    return {};
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole
  ) => {
    if (!supabase) {
      return { error: "Supabase connection is not configured yet." };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          role,
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    // Try to ensure profile row exists immediately
    if (data.user) {
      try {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          display_name: displayName,
          email,
          role,
          avatar_url:
            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
        });
      } catch {
        // Handled by database trigger
      }
    }

    return {
      message:
        "Account created successfully! Check your email to confirm if verification is enabled.",
    };
  };

  const signOut = async () => {
    if (!supabase) {
      setUser(null);
      setProfile(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    if (!supabase) {
      return { error: "Supabase connection is not configured yet." };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) {
      return { error: error.message };
    }
    return { message: "Password reset link sent to your email!" };
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const role: UserRole = profile?.role || "driver";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isLoading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
