import React from "react";
import { cn } from "@/lib/utils";
import { formatTime, getRecommendation } from "./calcEngine";

const LEVEL_CONFIG = {
  0: { text: "text-green-400", badge: "bg-green-900/50 text-green-400 border-green-700", label: "NORMAL" },
  1: { text: "text-amber-400", badge: "bg-amber-900/50 text-amber-400 border-amber-700", label: "ATTENTION" },
  2: { text: "text-red-400", badge: "bg-red-900/50 text-red-400 border-red-700", label: "ESCALATION PREPARED" },
  3: { text: "text-red-300", badge: "bg-red-800/60 text-red-300 border-red-600", label: "IMMEDIATE RISK" },
};

export default function PresentationHero({ timeToNearest, nearestName, escalationLevel, slope, equipment }) {
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

      {/* Footer */}
      <div className="mt-12 text-center">
        <p className="text-[#555] text-xs tracking-wide">This warning occurs BEFORE alarms or trips.</p>
        <p className="text-[#444] text-xs tracking-wide mt-1">This system provides foresight, not control.</p>
      </div>
    </div>
  );
}