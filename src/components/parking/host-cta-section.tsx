import Link from "next/link";
import { ArrowRight, IndianRupee, Calendar, ShieldCheck, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HostCtaSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-[#222222] via-[#2D2D2D] to-[#1A1A1A] text-white p-8 sm:p-14 lg:p-16 relative overflow-hidden shadow-2xl">
          {/* Subtle decorative background shapes */}
          <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 rounded-full bg-[#FF5A5F]/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#FF5A5F] text-xs font-bold mb-4 backdrop-blur-xs">
                Earn Up to ₹15,000/month per spot
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                Turn your unused driveway or garage into effortless passive income.
              </h2>
              <p className="mt-4 text-neutral-300 text-base sm:text-lg leading-relaxed">
                Whether you commute to work daily or have a spare commercial parking bay, ParkMate lets you monetize exact hours with automated access and ₹10,00,000 protection.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/owner">
                  <Button size="lg" className="rounded-full px-8 font-bold shadow-lg shadow-[#FF5A5F]/30 hover:scale-105 transition-all">
                    Start Hosting in 5 Minutes
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </Link>
                <Link href="/owner#calculator">
                  <Button variant="outline" size="lg" className="rounded-full px-6 font-bold bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white">
                    Calculate Space Earnings
                  </Button>
                </Link>
              </div>
            </div>

            {/* 3 Step Card Highlight */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-xs">
                <div className="h-10 w-10 rounded-xl bg-[#FF5A5F]/20 text-[#FF5A5F] flex items-center justify-center font-bold mb-3">
                  <Calendar className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-base mb-1">1. Smart Slot Sharing</h4>
                <p className="text-xs text-neutral-400">
                  Set recurring workday hours (e.g., 9am-5pm) and lock your space for personal evening use.
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-xs">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold mb-3">
                  <IndianRupee className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-base mb-1">2. Dynamic Surge Pricing</h4>
                <p className="text-xs text-neutral-400">
                  Our demand algorithm optimizes rates during local stadium events and morning rush.
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-xs">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold mb-3">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-base mb-1">3. Automated Access</h4>
                <p className="text-xs text-neutral-400">
                  Drivers access via gate codes, QR passes, or Bluetooth. No meeting drivers in person.
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-xs">
                <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold mb-3">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-base mb-1">4. Verified Community</h4>
                <p className="text-xs text-neutral-400">
                  Every driver is identity-verified with active vehicle registration on file.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
