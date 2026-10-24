import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "brand" | "neutral" | "success" | "warning" | "ev" | "outline" | "recovery";
}

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  const variants = {
    brand: "bg-[#FFF0F1] text-[#FF5A5F] border border-[#FFE3E5] font-semibold",
    neutral: "bg-[#F7F7F7] text-[#222222] border border-[#EAEAEA] font-medium",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold",
    warning: "bg-amber-50 text-amber-700 border border-amber-200 font-semibold",
    ev: "bg-sky-50 text-sky-700 border border-sky-200 font-semibold",
    outline: "bg-white text-[#717171] border border-[#DDDDDD] font-medium",
    recovery: "bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
