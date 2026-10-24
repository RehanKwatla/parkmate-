"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Car, 
  Menu, 
  User, 
  ShieldCheck, 
  Calendar, 
  LayoutDashboard, 
  PlusCircle, 
  X,
  Compass
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#EBEBEB] bg-white/95 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A5F] rounded-xl p-1"
          >
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-[#FF5A5F] to-[#FF7E82] flex items-center justify-center text-white shadow-md shadow-[#FF5A5F]/20 group-hover:scale-105 transition-transform">
              <Car className="h-5 w-5 fill-white/20 stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-[#222222] font-sans flex items-center gap-0.5">
                Park<span className="text-[#FF5A5F]">Mate</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#717171] -mt-1 hidden sm:block">
                Smart Space Marketplace
              </span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-[#F7F7F7] p-1.5 rounded-full border border-[#EAEAEA]">
            <Link
              href="/search"
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                pathname === "/search"
                  ? "bg-white text-[#222222] shadow-xs"
                  : "text-[#717171] hover:text-[#222222] hover:bg-white/60"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Compass className="h-4 w-4" />
                Find Parking
              </span>
            </Link>
            <Link
              href="/bookings"
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                pathname === "/bookings"
                  ? "bg-white text-[#222222] shadow-xs"
                  : "text-[#717171] hover:text-[#222222] hover:bg-white/60"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                My Bookings
              </span>
            </Link>
            <Link
              href="/owner"
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                pathname === "/owner"
                  ? "bg-white text-[#222222] shadow-xs"
                  : "text-[#717171] hover:text-[#222222] hover:bg-white/60"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <LayoutDashboard className="h-4 w-4" />
                Owner Hub
              </span>
            </Link>
          </nav>

          {/* Right Action Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/owner" className="hidden lg:block">
              <Button variant="ghost" size="sm" className="font-semibold text-sm hover:bg-[#F7F7F7] rounded-full px-4">
                List Your Space
              </Button>
            </Link>

            {/* Profile Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-expanded={isMenuOpen}
                aria-label="User navigation menu"
                className="flex items-center gap-2.5 border border-[#DDDDDD] hover:shadow-md transition-shadow rounded-full p-1.5 pl-3 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#222222]"
              >
                <Menu className="h-4 w-4 text-[#717171]" />
                <div className="h-8 w-8 rounded-full bg-[#222222] text-white flex items-center justify-center font-bold text-xs relative">
                  <User className="h-4 w-4" />
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#10B981] border-2 border-white" />
                </div>
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-xl border border-[#EAEAEA] py-2 z-50 animate-in fade-in zoom-in-95"
                  onBlur={() => setTimeout(() => setIsMenuOpen(false), 200)}
                >
                  <div className="px-4 py-2 border-b border-[#F0F0F0]">
                    <p className="text-xs text-[#717171]">Signed in as</p>
                    <p className="text-sm font-bold text-[#222222] truncate">Alex Mercer (Driver & Host)</p>
                  </div>
                  
                  <div className="py-1">
                    <Link
                      href="/bookings"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#222222] hover:bg-[#F7F7F7] font-medium"
                    >
                      <Calendar className="h-4 w-4 text-[#717171]" />
                      My Reservations
                    </Link>
                    <Link
                      href="/search"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#222222] hover:bg-[#F7F7F7] font-medium"
                    >
                      <Compass className="h-4 w-4 text-[#717171]" />
                      Search Nearby Parking
                    </Link>
                    <Link
                      href="/owner"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#222222] hover:bg-[#F7F7F7] font-medium"
                    >
                      <LayoutDashboard className="h-4 w-4 text-[#717171]" />
                      Host Dashboard
                    </Link>
                  </div>

                  <div className="border-t border-[#F0F0F0] pt-1">
                    <div className="px-4 py-2">
                      <div className="rounded-xl bg-[#FFF0F1] p-2.5 text-xs text-[#FF5A5F] flex items-start gap-2">
                        <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Recovery Protected</p>
                          <p className="text-[11px] text-[#222222]">Instant alternative space if booked spot is occupied.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger toggle */}
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="md:hidden p-2 text-[#717171] hover:text-[#222222] focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              {isMobileNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileNavOpen && (
        <div className="md:hidden border-t border-[#EAEAEA] bg-white px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-2">
          <Link
            href="/search"
            onClick={() => setIsMobileNavOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-semibold text-[#222222] hover:bg-[#F7F7F7]"
          >
            <Compass className="h-5 w-5 text-[#FF5A5F]" />
            Find Parking
          </Link>
          <Link
            href="/bookings"
            onClick={() => setIsMobileNavOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-semibold text-[#222222] hover:bg-[#F7F7F7]"
          >
            <Calendar className="h-5 w-5 text-[#FF5A5F]" />
            My Bookings
          </Link>
          <Link
            href="/owner"
            onClick={() => setIsMobileNavOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-semibold text-[#222222] hover:bg-[#F7F7F7]"
          >
            <LayoutDashboard className="h-5 w-5 text-[#FF5A5F]" />
            Owner Hub & Smart Sharing
          </Link>
          <div className="pt-2">
            <Link href="/owner" onClick={() => setIsMobileNavOpen(false)}>
              <Button className="w-full justify-center">
                <PlusCircle className="h-4 w-4 mr-2" />
                List Your Space
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
