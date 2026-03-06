import React from "react";
import { cn } from "@/lib/utils";

export const formatDemoTime = (t) => {
  if (t <= 0) return "NOW";
  if (t >= 10) return `~${Math.round(t)} min`;
  return `~${t.toFixed(1)} min`;
};

const UI_STATE_COLORS = {
  NORMAL:         { text: "text-[#0F9F9F]",  badge: "bg-[#0F5F5F]/50 text-[#0F9F9F] border border-[#0F7F7F]",  label: "NORMAL" },
  EARLY_DRIFT:    { text: "text-[#E67E22]",  badge: "bg-[#D35400]/40 text-[#E67E22] border border-[#D35400]",  label: "EARLY DRIFT" },
  SEVERE_DRIFT:   { text: "text-[#D4653F]",  badge: "bg-[#A13A1F]/50 text-[#D4653F] border border-[#A13A1F]",  label: "SEVERE DRIFT" },
  IMMEDIATE_RISK: { text: "text-[#C0392B]",  badge: "bg-[#7A0F0F]/60 text-[#C0392B] border border-[#7A0F0F]",  label: "IMMEDIATE RISK" },
};

const LEVEL_COLORS = {
  0: UI_STATE_COLORS.NORMAL,
  1: UI_STATE_COLORS.EARLY_DRIFT,
  2: UI_STATE_COLORS.SEVERE_DRIFT,
  3: UI_STATE_COLORS.IMMEDIATE_RISK,
};

export default function HeroMetric({
  timeToNearest,
  escalationLevel,
  slope,
  uiState,
  demoTimeMin,
  demoState,
}) {
  const useDemoClock = demoTimeMin !== null && demoTimeMin !== undefined;
  const activeState = useDemoClock ? demoState : uiState;
  const activeTime  = useDemoClock ? demoTimeMin : timeToNearest;
  const stable      = !useDemoClock && (slope <= 0 || timeToNearest === Infinity);

  const colors = activeState
    ? (UI_STATE_COLORS[activeState] || UI_STATE_COLORS.NORMAL)
    : (LEVEL_COLORS[escalationLevel] || LEVEL_COLORS[0]);

  const displayTime = stable ? "—" : formatDemoTime(activeTime);

  // Consequence projections (demo clock only)
  const hiTime   = useDemoClock && demoTimeMin > 0 ? formatDemoTime(demoTimeMin) : null;
  const hihiTime = useDemoClock && demoTimeMin > 0
    ? formatDemoTime(demoTimeMin + Math.max(1, demoTimeMin * 0.6))
    : null;

  const animationClass = (() => {
    if (stable) return "";
    if (activeState === "IMMEDIATE_RISK") return "animate-hero-pulse";
    if (activeState === "SEVERE_DRIFT")   return "animate-hero-breathe";
    return "";
  })();

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4">
      {!stable && (
        <div className={cn(
          "px-3 py-1 text-[10px] font-bold tracking-[0.15em] uppercase mb-3 transition-colors duration-700",
          colors.badge
        )}>
          {colors.label}
        </div>
      )}

      <p className="text-[#666] text-xs tracking-wider mb-1 uppercase">
        {stable ? "No operating limit projected" : "Time before nearest operating limit"}
      </p>

      <div className={cn(
        "text-[72px] md:text-[96px] font-extralight leading-none tracking-tight transition-colors duration-700",
        stable ? "text-green-400/80" : colors.text,
        animationClass
      )}>
        {displayTime}
      </div>

      {hiTime && (
        <div className="mt-4 text-center space-y-1">
          <p className="text-[#666] text-xs">If unchanged: High limit in {hiTime}</p>
          <p className="text-[#555] text-xs">Hi-Hi escalation in {hihiTime}</p>
        </div>
      )}
    </div>
  );
}