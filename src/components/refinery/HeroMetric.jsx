import React from "react";
import { cn } from "@/lib/utils";
import { formatTime } from "./calcEngine";

const LEVEL_COLORS = {
  0: { text: "text-[#0F9F9F]", badge: "bg-[#0F5F5F]/50 text-[#0F9F9F] border-[#0F7F7F]", label: "NORMAL" },
  1: { text: "text-[#D4A547]", badge: "bg-[#B47A1F]/50 text-[#D4A547] border-[#B47A1F]", label: "DRIFTING" },
  2: { text: "text-[#D4653F]", badge: "bg-[#A13A1F]/50 text-[#D4653F] border-[#A13A1F]", label: "ESCALATION PREPARED" },
  3: { text: "text-[#B53F3F]", badge: "bg-[#7A0F0F]/60 text-[#B53F3F] border-[#7A0F0F]", label: "IMMEDIATE RISK" },
};

export default function HeroMetric({ timeToNearest, nearestName, escalationLevel, slope, consequence }) {
  const stable = slope <= 0 || timeToNearest === Infinity;
  const colors = LEVEL_COLORS[escalationLevel] || LEVEL_COLORS[0];
  const displayTime = stable ? "—" : formatTime(timeToNearest);

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      {/* Status Badge */}
      <div className={cn("px-4 py-1.5 rounded border text-xs font-semibold tracking-widest uppercase mb-4", colors.badge)}>
        {colors.label}
      </div>

      {/* Subtitle */}
      <p className="text-[#888] text-sm tracking-wide mb-2">
        {stable ? "No near constraint projected" : "Time remaining before nearest constraint"}
      </p>

      {/* Hero Time */}
      <div
        className={cn(
          "text-[96px] md:text-[128px] font-extralight leading-none tracking-tight transition-all duration-700",
          stable ? "text-green-400/80" : colors.text,
          escalationLevel >= 3 && !stable && "animate-[pulse_3s_ease-in-out_infinite]"
        )}
      >
        {displayTime}
      </div>

      {/* Nearest Constraint Name */}
      {!stable && nearestName && (
        <p className="mt-4 text-[#aaa] text-base tracking-wide">
          Nearest constraint: <span className={cn("font-semibold", colors.text)}>{nearestName}</span>
        </p>
      )}

      {/* Consequence */}
      {!stable && consequence && (
        <p className="mt-2 text-[#777] text-sm">{consequence}</p>
      )}
    </div>
  );
}