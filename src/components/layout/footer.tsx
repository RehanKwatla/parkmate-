"use client";

import Link from "next/link";
import { ShieldCheck, Globe } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-[#EBEBEB] bg-[#F7F7F7] text-[#717171] text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1 */}
          <div>
            <h4 className="font-bold text-[#222222] mb-4">Support & Drivers</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/search" className="hover:text-[#222222] hover:underline">
                  Find Guaranteed Parking
                </Link>
              </li>
              <li>
                <Link href="/bookings" className="hover:text-[#222222] hover:underline">
                  Booking Recovery Protocol
                </Link>
              </li>
              <li>
                <span className="text-[#999999] cursor-not-allowed">Cancellation Options</span>
              </li>
              <li>
                <span className="text-[#999999] cursor-not-allowed">Accessibility in Garages</span>
              </li>
              <li>
                <span className="text-[#999999] cursor-not-allowed">Report Access Issue</span>
              </li>
            </ul>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="font-bold text-[#222222] mb-4">Host Your Space</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/owner" className="hover:text-[#222222] hover:underline">
                  Smart Space Sharing
                </Link>
              </li>
              <li>
                <Link href="/owner" className="hover:text-[#222222] hover:underline">
                  Demand Prediction AI
                </Link>
              </li>
              <li>
                <span className="text-[#999999] cursor-not-allowed">$1,000,000 Property Damage Protection</span>
              </li>
              <li>
                <span className="text-[#999999] cursor-not-allowed">Host Community Forum</span>
              </li>
              <li>
                <span className="text-[#999999] cursor-not-allowed">Commercial Space API</span>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="font-bold text-[#222222] mb-4">Core Differentiators</h4>
            <ul className="space-y-3 text-xs">
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-[#222222]">1. Booking Recovery:</span> Automatic alternative allocation if a space is blocked.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-[#222222]">2. Vehicle Compatibility:</span> Precise ceiling clearance & bay dimension filters.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-[#222222]">3. Flexible Extensions:</span> 1-click extra time if no conflicting booking exists.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-[#222222]">4. Demand Prediction:</span> Dynamic occupancy optimization for hosts.
              </li>
            </ul>
          </div>

          {/* Col 4 */}
          <div>
            <h4 className="font-bold text-[#222222] mb-4">ParkMate Trust</h4>
            <p className="text-xs text-[#717171] leading-relaxed mb-4">
              ParkMate connects verified space owners with courteous drivers, reducing urban congestion and parking search emissions.
            </p>
            <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-[#EAEAEA]">
              <ShieldCheck className="h-5 w-5 text-[#10B981] shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-[#222222]">100% Guaranteed Parking</p>
                <p className="text-[11px] text-[#717171]">Every booking backed by Recovery Rebooking</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-[#EAEAEA] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span>&copy; 2026 ParkMate Inc. All rights reserved.</span>
            <span>&middot;</span>
            <span className="hover:text-[#222222] cursor-pointer">Privacy</span>
            <span>&middot;</span>
            <span className="hover:text-[#222222] cursor-pointer">Terms</span>
            <span>&middot;</span>
            <span className="hover:text-[#222222] cursor-pointer">Sitemap</span>
          </div>

          <div className="flex items-center gap-6 font-semibold text-[#222222]">
            <span className="flex items-center gap-1.5 cursor-pointer hover:underline">
              <Globe className="h-4 w-4" /> English (IN)
            </span>
            <span className="cursor-pointer hover:underline">₹ INR</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
