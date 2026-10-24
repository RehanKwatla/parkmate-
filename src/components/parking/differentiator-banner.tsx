import { 
  ShieldAlert, 
  Ruler, 
  Clock, 
  TrendingUp, 
  CalendarCheck2, 
  CheckCircle2,
  Sparkles
} from "lucide-react";

export function DifferentiatorsSection() {
  const features = [
    {
      icon: ShieldAlert,
      title: "1. Booking Recovery Guarantee",
      badge: "Zero-Stress Parking",
      description: "If your booked space is blocked or access fails, ParkMate automatically unlocks an equal or upgraded alternative space nearby at no extra charge.",
      color: "text-rose-600",
      bgColor: "bg-rose-50",
    },
    {
      icon: Ruler,
      title: "2. Vehicle Compatibility Verification",
      badge: "No Scrapes or Rejections",
      description: "Filter spaces by exact vehicle dimensions, ground clearance, and ceiling height. No more booking a spot only to find your SUV or truck doesn't fit.",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: Clock,
      title: "3. 1-Click Flexible Extensions",
      badge: "Stay Without Fines",
      description: "Running late? Request extra time with one tap. If no immediate driver reservation overlaps, your booking extends instantly at fair pro-rated rates.",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      icon: TrendingUp,
      title: "4. Smart Demand Prediction",
      badge: "Host Revenue Optimizer",
      description: "Hosts maximize earnings with automated demand forecasting based on local concerts, game days, and rush hour commuting patterns.",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      icon: CalendarCheck2,
      title: "5. Smart Space Sharing",
      badge: "Monetize Idle Driveways",
      description: "Publish unused driveway or garage slots during your workday (e.g. 8:30 AM to 5:30 PM) while keeping your spot reserved when you return home.",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <section className="py-16 bg-[#F7F7F7] border-y border-[#EBEBEB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0F1] text-[#FF5A5F] text-xs font-bold mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            The ParkMate Standard
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#222222] tracking-tight">
            Why Drivers & Hosts Prefer ParkMate
          </h2>
          <p className="mt-3 text-[#717171] text-base">
            Built from the ground up to eliminate urban parking uncertainty with real guarantees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="rounded-3xl bg-white p-7 border border-[#EAEAEA] shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`h-12 w-12 rounded-2xl ${item.bgColor} ${item.color} flex items-center justify-center`}>
                      <Icon className="h-6 w-6 stroke-[2.2]" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#717171] bg-[#F7F7F7] px-2.5 py-1 rounded-full border border-[#EAEAEA]">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#222222] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#717171] leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#F0F0F0] flex items-center gap-2 text-xs font-bold text-[#222222]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Guaranteed on all eligible listings</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
