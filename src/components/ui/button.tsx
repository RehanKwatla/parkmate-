import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "brand" | "secondary" | "outline" | "ghost" | "danger" | "soft";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "brand", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none cursor-pointer";

    const variants = {
      brand: "bg-[#FF5A5F] text-white hover:bg-[#E0484D] focus-visible:ring-[#FF5A5F] shadow-sm hover:shadow",
      secondary: "bg-[#222222] text-white hover:bg-[#000000] focus-visible:ring-[#222222]",
      outline: "border border-[#DDDDDD] bg-white text-[#222222] hover:bg-[#F7F7F7] hover:border-[#222222] focus-visible:ring-[#222222]",
      ghost: "text-[#222222] hover:bg-[#F7F7F7] focus-visible:ring-neutral-400",
      danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
      soft: "bg-[#FFF0F1] text-[#FF5A5F] hover:bg-[#FFE3E5] focus-visible:ring-[#FF5A5F]",
    };

    const sizes = {
      sm: "text-xs px-3 py-1.5 rounded-full gap-1.5",
      md: "text-sm px-4 py-2.5 rounded-xl gap-2",
      lg: "text-base px-6 py-3.5 rounded-2xl gap-2.5",
      icon: "h-9 w-9 rounded-full p-0 flex items-center justify-center",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
