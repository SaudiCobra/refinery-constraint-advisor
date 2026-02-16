import React from "react";
import { cn } from "@/lib/utils";
import { formatTime, getRecommendation } from "./calcEngine";

const LEVEL_CONFIG = {
  0: { text: "text-[#0F9F9F]", badge: "bg-[#0F5F5F]/50 text-[#0F9F9F] border-[#0F7F7F]", label: "NORMAL" },
  1: { text: "text-[#D4A547]", badge: "bg-[#B47A1F]/50 text-[#D4A547] border-[#B47A1F]", label: "DRIFTING" },
  2: { text: "text-[#D4653F]", badge: "bg-[#A13A1F]/50 text-[#D4653F] border-[#A13A1F]", label: "ESCALATION PREPARED" },
  3: { text: "text-[#B53F3F]", badge: "bg-[#7A0F0F]/60 text-[#B53F3F] border-[#7A0F0F]", label: "IMMEDIATE RISK" },
};

export default function PresentationHero({ 
  timeToNearest, 
  nearestName, 
  escalationLevel, 
  slope, 
  equipment,
  preheatActive,
  preheatStatus,
  coolingCapacity 
}) {
  const stable = slope <= 0 || timeToNearest === Infinity;
  const config = LEVEL_CONFIG[escalationLevel] || LEVEL_CONFIG[0];
  const displayTime = stable ? "—" : formatTime(timeToNearest);
  const recommendation = getRecommendation(escalationLevel, { name: nearestName }, equipment);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      {/* Status Badge */}
      <div className={cn("px-5 py-2 rounded border text-sm font-semibold tracking-widest uppercase mb-6", config.badge)}>
        {config.label}
      </div>

      {/* Subtitle */}
      <p className="text-[#888] text-base tracking-wide mb-3">
        {stable ? "No near constraint projected" : "Time remaining before nearest constraint"}
      </p>

      {/* Hero Time */}
      <div
        className={cn(
          "text-[120px] md:text-[160px] lg:text-[200px] font-extralight leading-none tracking-tight transition-all duration-700",
          stable ? "text-green-400/80" : config.text,
          escalationLevel >= 3 && !stable && "animate-[pulse_3s_ease-in-out_infinite]"
        )}
      >
        {displayTime}
      </div>

      {/* Nearest Constraint */}
      {!stable && nearestName && (
        <p className="mt-6 text-[#aaa] text-lg tracking-wide">
          Nearest constraint: <span className={cn("font-semibold", config.text)}>{nearestName}</span>
        </p>
      )}

      {/* Consequence */}
      {!stable && (
        <p className="mt-2 text-[#777] text-base">
          If unchanged: {nearestName} in {displayTime}
        </p>
      )}

      {/* Escalation Badge */}
      <div className={cn("mt-6 px-4 py-1.5 rounded border text-xs font-medium tracking-wider uppercase", config.badge)}>
        Escalation Level {escalationLevel}
      </div>

      {/* Recommendation */}
      <p className="mt-4 text-[#999] text-sm italic">{recommendation}</p>

      {/* Preheat & Cooling Status */}
      {preheatActive && preheatStatus && (
        <p className="mt-3 text-[#777] text-xs">Preheat: {preheatStatus}</p>
      )}
      {coolingCapacity !== "NORMAL" && (
        <p className="mt-2 text-[#777] text-xs">Cooling Capacity: {coolingCapacity}</p>
      )}

      {/* Footer */}
      <div className="mt-12 text-center">
        <p className="text-[#555] text-xs tracking-wide">This warning occurs BEFORE alarms or trips.</p>
        <p className="text-[#444] text-xs tracking-wide mt-1">This system provides foresight, not control.</p>
      </div>
    </div>
  );
}