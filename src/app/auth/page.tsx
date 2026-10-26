"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Car, 
  Lock, 
  Mail, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Home,
  Sparkles,
  KeyRound
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserRole } from "@/types/database";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const { user, signIn, signUp, resetPassword, isLoading: isAuthLoading } = useAuth();

  const [mode, setMode] = React.useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("driver");

  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // If already logged in, redirect
  React.useEffect(() => {
    if (user && !isAuthLoading) {
      router.push(redirectUrl);
    }
  }, [user, isAuthLoading, router, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) {
          setErrorMessage(error);
        } else {
          setSuccessMessage("Logged in successfully! Redirecting...");
          setTimeout(() => router.push(redirectUrl), 800);
        }
      } else if (mode === "signup") {
        if (!displayName.trim()) {
          setErrorMessage("Please enter your name.");
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMessage("Password must be at least 6 characters.");
          setIsLoading(false);
          return;
        }

        const { error, message } = await signUp(email, password, displayName, role);
        if (error) {
          setErrorMessage(error);
        } else {
          setSuccessMessage(message || "Account registered successfully! Redirecting...");
          setTimeout(() => router.push(redirectUrl), 1000);
        }
      } else if (mode === "forgot") {
        const { error, message } = await resetPassword(email);
        if (error) {
          setErrorMessage(error);
        } else {
          setSuccessMessage(message || "Password reset email sent.");
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoAccount = (demoRole: "driver" | "owner") => {
    if (demoRole === "driver") {
      setEmail("driver.demo@parkmate.dev");
      setPassword("ParkMateDriver2026!");
      setDisplayName("Alex Mercer");
      setRole("driver");
    } else {
      setEmail("owner.demo@parkmate.dev");
      setPassword("ParkMateHost2026!");
      setDisplayName("Marcus Vance");
      setRole("owner");
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-4 group">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-[#FF5A5F] to-[#FF7E82] flex items-center justify-center text-white shadow-md shadow-[#FF5A5F]/20">
            <Car className="h-6 w-6 fill-white/20 stroke-[2.2]" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-[#222222]">
            Park<span className="text-[#FF5A5F]">Mate</span>
          </span>
        </Link>
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-[#222222] tracking-tight">
          {mode === "signin" && "Welcome back"}
          {mode === "signup" && "Create your ParkMate account"}
          {mode === "forgot" && "Reset your password"}
        </h2>
        <p className="mt-2 text-center text-xs sm:text-sm text-[#717171]">
          {mode === "signin" && "Sign in to manage bookings, host spaces, and access passes."}
          {mode === "signup" && "Join the smart space marketplace to park or earn."}
          {mode === "forgot" && "Enter your email address and we'll send you a recovery link."}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl border border-[#EAEAEA] rounded-3xl">
          {/* Mode Switcher Tabs */}
          {mode !== "forgot" && (
            <div className="flex rounded-2xl bg-[#F7F7F7] p-1 border border-[#EAEAEA] mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  mode === "signin"
                    ? "bg-white text-[#222222] shadow-xs"
                    : "text-[#717171] hover:text-[#222222]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  mode === "signup"
                    ? "bg-white text-[#222222] shadow-xs"
                    : "text-[#717171] hover:text-[#222222]"
                }`}
              >
                Register
              </button>
            </div>
          )}

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="mb-4 rounded-2xl bg-red-50 p-3.5 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-2xl bg-emerald-50 p-3.5 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-bold text-[#222222] mb-1">
                  Full Name / Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-[#999999]" />
                  <Input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex Mercer"
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#222222] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-[#999999]" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="pl-10"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#222222]">
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] font-semibold text-[#FF5A5F] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-[#999999]" />
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            {/* Role Selection on Sign Up */}
            {mode === "signup" && (
              <div className="pt-1">
                <label className="block text-xs font-bold text-[#222222] mb-1.5">
                  How will you use ParkMate?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("driver")}
                    className={`p-2.5 rounded-2xl border text-center transition-all ${
                      role === "driver"
                        ? "border-[#FF5A5F] bg-[#FFF0F1] text-[#FF5A5F] font-bold ring-1 ring-[#FF5A5F]"
                        : "border-[#EAEAEA] bg-white text-[#717171] hover:border-[#CCCCCC]"
                    }`}
                  >
                    <Car className="h-4 w-4 mx-auto mb-1" />
                    <span className="text-[11px] block">Driver</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("owner")}
                    className={`p-2.5 rounded-2xl border text-center transition-all ${
                      role === "owner"
                        ? "border-[#FF5A5F] bg-[#FFF0F1] text-[#FF5A5F] font-bold ring-1 ring-[#FF5A5F]"
                        : "border-[#EAEAEA] bg-white text-[#717171] hover:border-[#CCCCCC]"
                    }`}
                  >
                    <Home className="h-4 w-4 mx-auto mb-1" />
                    <span className="text-[11px] block">Space Host</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("both")}
                    className={`p-2.5 rounded-2xl border text-center transition-all ${
                      role === "both"
                        ? "border-[#FF5A5F] bg-[#FFF0F1] text-[#FF5A5F] font-bold ring-1 ring-[#FF5A5F]"
                        : "border-[#EAEAEA] bg-white text-[#717171] hover:border-[#CCCCCC]"
                    }`}
                  >
                    <Sparkles className="h-4 w-4 mx-auto mb-1" />
                    <span className="text-[11px] block">Both</span>
                  </button>
                </div>
                <p className="text-[10px] text-[#717171] mt-1.5">
                  You can seamlessly switch roles anytime from your dashboard.
                </p>
              </div>
            )}

            <Button
              type="submit"
              variant="brand"
              className="w-full justify-center mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <span>Processing...</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  {mode === "signin" && "Sign In to ParkMate"}
                  {mode === "signup" && "Create My Account"}
                  {mode === "forgot" && "Send Password Reset"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          {mode === "forgot" && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-xs font-semibold text-[#717171] hover:text-[#222222] hover:underline"
              >
                &larr; Back to sign in
              </button>
            </div>
          )}

          {/* Quick Test Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-[#F0F0F0]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#717171] mb-2.5 flex items-center gap-1">
              <KeyRound className="h-3 w-3" /> Quick Demo Autofill:
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fillDemoAccount("driver")}
                className="flex-1 py-1.5 px-2 bg-[#F7F7F7] hover:bg-[#EAEAEA] border border-[#EAEAEA] rounded-xl text-[11px] font-semibold text-[#222222] transition-colors"
              >
                Driver Account
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount("owner")}
                className="flex-1 py-1.5 px-2 bg-[#F7F7F7] hover:bg-[#EAEAEA] border border-[#EAEAEA] rounded-xl text-[11px] font-semibold text-[#222222] transition-colors"
              >
                Host Account
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 text-center">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-[#717171]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Secured with Supabase Row Level Security</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#F7F7F7]" />}>
      <AuthContent />
    </React.Suspense>
  );
}

