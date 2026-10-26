"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, CheckCircle2, AlertCircle, ArrowRight, Car } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (!supabase) {
      setErrorMessage("Supabase is not configured yet.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage("Password successfully updated! Redirecting to sign in...");
        setTimeout(() => {
          router.push("/auth");
        }, 1500);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update password.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
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
        <h2 className="text-center text-2xl font-extrabold text-[#222222] tracking-tight">
          Set New Password
        </h2>
        <p className="mt-2 text-center text-xs sm:text-sm text-[#717171]">
          Please enter and confirm your new secure password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl border border-[#EAEAEA] rounded-3xl">
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

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#222222] mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-[#999999]" />
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#222222] mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-[#999999]" />
                <Input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="brand"
              className="w-full justify-center mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <span>Updating...</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Update Password
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
