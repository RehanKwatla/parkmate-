"use client";

import * as React from "react";
import { 
  LayoutGrid, 
  Warehouse, 
  Zap, 
  Calendar, 
  Clock, 
  Ticket, 
  Plane 
} from "lucide-react";
import { SpaceCategory } from "@/types/parking";
import { CATEGORIES } from "@/lib/constants";

interface CategoryTabsProps {
  activeCategory: SpaceCategory;
  onSelectCategory: (category: SpaceCategory) => void;
}

const ICON_MAP = {
  LayoutGrid,
  Warehouse,
  Zap,
  Calendar,
  Clock,
  Ticket,
  Plane,
};

export function CategoryTabs({ activeCategory, onSelectCategory }: CategoryTabsProps) {
  return (
    <div className="w-full border-b border-[#EBEBEB] bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto no-scrollbar py-3">
          {CATEGORIES.map((cat) => {
            const Icon = ICON_MAP[cat.iconName as keyof typeof ICON_MAP] || LayoutGrid;
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`flex flex-col items-center gap-1.5 pb-2 text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer focus-visible:outline-none ${
                  isActive
                    ? "border-[#222222] text-[#222222] opacity-100"
                    : "border-transparent text-[#717171] hover:text-[#222222] hover:border-[#DDDDDD] opacity-75 hover:opacity-100"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-[#FF5A5F]" : "text-[#717171]"}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
