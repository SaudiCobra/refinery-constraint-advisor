import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export default function LeverContext({ equipment, coolingCapacity, escalationLevel }) {
  const levers = [
    {
      available: coolingCapacity !== "CONSTRAINED",
      label: "Cooling headroom available",
      description: "E-2 not saturated",
    },
    {
      available: equipment.h2Compressor,
      label: "Hydrogen moderation possible",
      description: "H₂ availability not constrained",
    },
    {
      available: equipment.bypassValve,
      label: "Bypass routing flexibility intact",
      description: "Control valves operational",
    },
    {
      available: escalationLevel < 3,
      label: "No hard equipment or safety limits reached",
      description: "Operating margin remains",
    },
  ];

  const availableCount = levers.filter(l => l.available).length;

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[#aaa] text-sm font-semibold uppercase tracking-wider">
          Operational Flexibility
        </h4>
        <span className={cn(
          "text-xs font-bold px-2 py-0.5 rounded",
          availableCount >= 3 && "bg-[#0F5F5F]/50 text-[#0F9F9F]",
          availableCount === 2 && "bg-[#B47A1F]/50 text-[#D4A547]",
          availableCount <= 1 && "bg-[#A13A1F]/50 text-[#D4653F]"
        )}>
          {availableCount}/4 Available
        </span>
      </div>

      <div className="space-y-2">
        {levers.map((lever, idx) => (
          <div key={idx} className="flex items-start gap-2">
            {lever.available ? (
              <CheckCircle2 className="w-4 h-4 text-[#0F9F9F] flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#A13A1F] flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={cn(
                "text-sm leading-tight",
                lever.available ? "text-[#ccc]" : "text-[#888] line-through"
              )}>
                {lever.label}
              </p>
              <p className="text-xs text-[#666] mt-0.5">{lever.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
        <p className="text-[#666] text-xs italic">
          Advisory indicators only — no action implied
        </p>
      </div>
    </div>
  );
}