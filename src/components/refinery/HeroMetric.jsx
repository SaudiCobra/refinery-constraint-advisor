import React from "react";
import { cn } from "@/lib/utils";
import { formatTime } from "./calcEngine";

const UI_STATE_COLORS = {
  NORMAL: { text: "text-[#0F9F9F]", badge: "bg-[#0F5F5F]/50 text-[#0F9F9F] border border-[#0F7F7F]", label: "NORMAL" },
  EARLY_DRIFT: { text: "text-[#E67E22]", badge: "bg-[#D35400]/40 text-[#E67E22] border border-[#D35400]", label: "EARLY DRIFT" },
  SEVERE_DRIFT: { text: "text-[#D4653F]", badge: "bg-[#A13A1F]/50 text-[#D4653F] border border-[#A13A1F]", label: "SEVERE DRIFT" },
  IMMEDIATE_RISK: { text: "text-[#C0392B]", badge: "bg-[#7A0F0F]/60 text-[#C0392B] border border-[#7A0F0F]", label: "IMMEDIATE RISK" },
};

// Legacy escalation level mapping (fallback)
const LEVEL_COLORS = {
  0: UI_STATE_COLORS.NORMAL,
  1: UI_STATE_COLORS.EARLY_DRIFT,
  2: UI_STATE_COLORS.SEVERE_DRIFT,
  3: UI_STATE_COLORS.IMMEDIATE_RISK,
};

export default function HeroMetric({ timeToNearest, nearestName, escalationLevel, slope, consequence, uiState }) {
  const stable = slope <= 0 || timeToNearest === Infinity;
  
  // Use explicit uiState if provided (scenario-driven), else fallback to escalation level
  const colors = uiState 
    ? (UI_STATE_COLORS[uiState] || UI_STATE_COLORS.NORMAL)
    : (LEVEL_COLORS[escalationLevel] || LEVEL_COLORS[0]);
  
  const displayTime = stable ? "—" : formatTime(timeToNearest);

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4">
      {!stable && (
        <div className={cn("px-3 py-1 text-[10px] font-bold tracking-[0.15em] uppercase mb-3", colors.badge)}>
          {colors.label}
        </div>
      )}
      
      {/* Subtitle - compact */}
      <p className="text-[#666] text-xs tracking-wider mb-1 uppercase">
        {stable ? "No operating limit projected" : "Time before nearest operating limit"}
      </p>

      {/* Hero Time */}
      <div
        className={cn(
          "text-[72px] md:text-[96px] font-extralight leading-none tracking-tight transition-all duration-700",
          stable ? "text-green-400/80" : colors.text,
          uiState === "IMMEDIATE_RISK" && !stable && "animate-[pulse_3s_ease-in-out_infinite]"
        )}
      >
        {displayTime}
      </div>
    </div>
  );
}