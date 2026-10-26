import type { Metadata } from "next";
import * as React from "react";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "ParkMate | Smart Parking-Space Marketplace",
  description:
    "Discover, reserve, and share verified parking spaces. Guaranteed vehicle compatibility, booking recovery protection, and flexible time extensions.",
  keywords: [
    "parking",
    "parking space marketplace",
    "ev charging parking",
    "covered parking",
    "airport parking",
    "event parking",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-white text-[#222222] antialiased selection:bg-[#FFF0F1] selection:text-[#FF5A5F]">
        <AuthProvider>
          <React.Suspense
            fallback={<div className="h-20 border-b border-[#EBEBEB] bg-white" />}
          >
            <Navbar />
          </React.Suspense>
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
