"use client";

import * as React from "react";
import Link from "next/link";
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Plus, 
  ToggleLeft, 
  ToggleRight, 
  Sparkles, 
  ShieldCheck, 
  ArrowUpRight, 
  BarChart3, 
  CalendarCheck2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function OwnerDashboardPage() {
  const [smartShareActive, setSmartShareActive] = React.useState(true);
  const [demandMultiplier] = React.useState(1.4);
  const [selectedDays, setSelectedDays] = React.useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [shareStart, setShareStart] = React.useState("08:30");
  const [shareEnd, setShareEnd] = React.useState("17:30");
  const [spacePaused, setSpacePaused] = React.useState(false);

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              Owner &amp; Space Host Hub
            </div>
            <h1 className="text-3xl font-extrabold text-[#222222] tracking-tight">
              Host Performance &amp; Space Management
            </h1>
            <p className="text-sm text-[#717171] mt-1">
              Automate driveway sharing, optimize surge pricing, and track monthly payouts
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/search">
              <Button variant="outline" size="sm" className="rounded-full">
                View Public Listings
              </Button>
            </Link>
            <Button size="sm" className="rounded-full shadow-xs">
              <Plus className="h-4 w-4 mr-1.5" />
              Add New Parking Space
            </Button>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="rounded-3xl bg-white p-6 border border-[#EAEAEA] shadow-xs">
            <div className="flex items-center justify-between text-[#717171] mb-2 text-xs font-bold uppercase tracking-wider">
              <span>Monthly Earnings</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-[#222222]">$1,248.50</p>
            <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-2">
              <ArrowUpRight className="h-3.5 w-3.5" /> +18.4% vs last month
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 border border-[#EAEAEA] shadow-xs">
            <div className="flex items-center justify-between text-[#717171] mb-2 text-xs font-bold uppercase tracking-wider">
              <span>Occupancy Rate</span>
              <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <BarChart3 className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-[#222222]">87.2%</p>
            <p className="text-xs text-blue-600 font-semibold flex items-center gap-1 mt-2">
              <TrendingUp className="h-3.5 w-3.5" /> High demand corridor
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 border border-[#EAEAEA] shadow-xs">
            <div className="flex items-center justify-between text-[#717171] mb-2 text-xs font-bold uppercase tracking-wider">
              <span>Reservations</span>
              <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-[#222222]">46 Bookings</p>
            <p className="text-xs text-[#717171] font-medium mt-2">
              0 cancellations &middot; 4.96 rating
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 border border-[#EAEAEA] shadow-xs">
            <div className="flex items-center justify-between text-[#717171] mb-2 text-xs font-bold uppercase tracking-wider">
              <span>Active Spaces</span>
              <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-[#222222]">2 Active</p>
            <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-2">
              All spaces verified &amp; protected
            </p>
          </div>
        </div>

        {/* 2 Main Feature Panels: Smart Space Sharing + Demand Prediction */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Differentiator 5: Smart Space Sharing Scheduler */}
          <div className="rounded-3xl bg-white p-7 border border-[#EAEAEA] shadow-sm space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full mb-1.5">
                  <CalendarCheck2 className="h-3 w-3" />
                  Differentiator 5
                </div>
                <h3 className="text-xl font-extrabold text-[#222222]">
                  Smart Space Sharing Scheduler
                </h3>
                <p className="text-xs text-[#717171] mt-0.5">
                  Publish idle hours while you are at work. Spot locks automatically before you return.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSmartShareActive(!smartShareActive)}
                className="text-2xl text-[#222222] transition-colors"
                aria-label="Toggle Smart Space Sharing"
              >
                {smartShareActive ? (
                  <ToggleRight className="h-8 w-8 text-[#10B981]" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-[#999999]" />
                )}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#222222] mb-2">
                  Active Share Days:
                </label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map((day) => {
                    const isSelected = selectedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`h-9 w-11 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-[#222222] text-white"
                            : "bg-[#F7F7F7] text-[#717171] hover:bg-[#EAEAEA]"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#222222] mb-1">
                    Opens At (When You Leave):
                  </label>
                  <input
                    type="time"
                    value={shareStart}
                    onChange={(e) => setShareStart(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-[#DDDDDD] p-2.5 bg-[#F7F7F7]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#222222] mb-1">
                    Closes At (When You Return):
                  </label>
                  <input
                    type="time"
                    value={shareEnd}
                    onChange={(e) => setShareEnd(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-[#DDDDDD] p-2.5 bg-[#F7F7F7]"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-purple-50 p-4 border border-purple-100 text-xs text-purple-900 space-y-1">
                <p className="font-bold">Protected Return Guarantee</p>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  Drivers cannot book past {shareEnd}. If an unexpected extension is requested, the system automatically redirects them to a nearby recovery partner so your space is guaranteed free when you get home.
                </p>
              </div>
            </div>
          </div>

          {/* Differentiator 4: Demand Prediction & Dynamic Pricing */}
          <div className="rounded-3xl bg-white p-7 border border-[#EAEAEA] shadow-sm space-y-6">
            <div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full mb-1.5">
                <TrendingUp className="h-3 w-3" />
                Differentiator 4
              </div>
              <h3 className="text-xl font-extrabold text-[#222222]">
                Demand Prediction &amp; Dynamic Pricing
              </h3>
              <p className="text-xs text-[#717171] mt-0.5">
                Estimated demand based on event schedules, weather, and commuter flow.
              </p>
            </div>

            <div className="rounded-2xl bg-[#F7F7F7] p-4 border border-[#EAEAEA] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#222222] block">Current Demand Multiplier:</span>
                  <span className="text-2xl font-extrabold text-amber-600">+{Math.round((demandMultiplier - 1) * 100)}% Surge</span>
                </div>
                <Badge variant="warning">High Demand Predicted</Badge>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#EAEAEA]">
                <p className="text-xs font-bold text-[#222222]">Upcoming Local Catalysts:</p>
                <div className="space-y-1.5 text-xs text-[#717171]">
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-[#EAEAEA]">
                    <span>Chase Center: Warriors vs Celtics</span>
                    <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px]">Tomorrow 7:30 PM (+35%)</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-[#EAEAEA]">
                    <span>Moscone Tech Summit (12k attendees)</span>
                    <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px]">Thu - Fri (+45%)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-[#717171]">Recommended Price:</span>
              <span className="font-extrabold text-base text-[#222222]">$7.50 &rarr; $10.50/hr</span>
            </div>
          </div>
        </div>

        {/* Active Spaces Table / Manager */}
        <div className="rounded-3xl bg-white border border-[#EAEAEA] p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-[#222222]">Your Listed Spaces</h3>
            <span className="text-xs text-[#717171]">1 of 2 spots occupied right now</span>
          </div>

          <div className="divide-y divide-[#F0F0F0] text-xs">
            <div className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=400&q=80"
                  alt="Garage space"
                  className="h-14 w-16 rounded-xl object-cover"
                />
                <div>
                  <h4 className="font-bold text-[#222222] text-sm">Downtown Secure Garage Bay A12</h4>
                  <p className="text-[#717171]">245 Market St &middot; Clearance: 7.2 ft &middot; Level 2 EV</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-[11px]">
                  Driver Parked (Audi Q5)
                </span>
                <span className="font-extrabold text-sm">$7.50 / hr</span>
              </div>
            </div>

            <div className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=400&q=80"
                  alt="Driveway space"
                  className="h-14 w-16 rounded-xl object-cover"
                />
                <div>
                  <h4 className="font-bold text-[#222222] text-sm">Residential Paved Driveway (Nob Hill)</h4>
                  <p className="text-[#717171]">712 Pine Ave &middot; Tesla Gen 3 Charger</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSpacePaused(!spacePaused)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-colors ${
                    spacePaused
                      ? "bg-amber-50 text-amber-800 border-amber-300"
                      : "bg-[#222222] text-white border-[#222222]"
                  }`}
                >
                  {spacePaused ? "Paused" : "Active & Accepting"}
                </button>
                <span className="font-extrabold text-sm">$5.00 / hr</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
