import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-[#DDDDDD] bg-white px-3.5 py-2 text-sm text-[#222222] transition-colors placeholder:text-[#999999] focus-visible:outline-none focus-visible:border-[#222222] focus-visible:ring-1 focus-visible:ring-[#222222] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
