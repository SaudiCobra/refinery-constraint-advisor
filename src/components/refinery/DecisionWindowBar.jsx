import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { ClockIcon, TrendingUpIcon } from "./DashboardIcons";

import { formatDemoTime } from "./HeroMetric";

export default function DecisionWindowBar({ 
  timeToNearest, 
  escalationLevel,
  coolingCapacity,
  equipment,
  hotSpotRisk,
  slope,
  currentTemp,
  demoTimeMin,
  demoState,
  isPreheatMode = false,
}) {
  // ── Preheat override ──────────────────────────────────────────────────────
  if (isPreheatMode) {
    return (
      <div className="space-y-2">
        <div className="flex flex-col gap-1.5 bg-[#1e1e1e] border border-[#2a1a00] rounded-lg px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClockIcon className="w-3.5 h-3.5 text-[#C8AA50]" />
              <span className="text-[#C8AA50] text-xs uppercase tracking-wider font-semibold">Warm-Up Phase</span>
            </div>
            <span className="text-[#C8AA50] text-sm font-semibold">Controlled</span>
          </div>
          <div className="w-full h-3 bg-[#0d0d0d] rounded-full border border-[#2a2a2a] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: "100%", backgroundColor: "#1a6a6a" }} />
          </div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2">
          <p className="text-[#aaa] text-xs leading-relaxed">
            Reactor warm-up in progress — no operating limit active. Escalation monitoring suspended until RIT reaches 335°C.
          </p>
        </div>
      </div>
    );
  }
  const activeTime = (demoTimeMin !== null && demoTimeMin !== undefined) ? demoTimeMin : timeToNearest;

  // Bar fill clamps to 35 min scale so NORMAL overflows to 100% (that's fine).
  // The displayed label always shows the real value including >35.
  const maxTime = 35;
  const fillPercent = activeTime === Infinity || activeTime == null 
    ? 100 
    : Math.min(100, (activeTime / maxTime) * 100);
  
  // Color thresholds aligned to 4 states:
  //   IMMEDIATE_RISK: <=4   deep red
  //   SEVERE_DRIFT:   <=13  burnt orange
  //   EARLY_DRIFT:    <=35  amber
  //   NORMAL:         >35   neutral grey/teal
  const getBarColor = (time) => {
    if (time === Infinity || time == null) return "#1a6a6a"; // NORMAL teal
    if (time <= 4)  return "#7A0F0F"; // IMMEDIATE_RISK — deep red
    if (time <= 13) return "#A13A1F"; // SEVERE_DRIFT — burnt orange
    if (time <= 35) return "#D35400"; // EARLY_DRIFT — amber
    return "#1a6a6a"; // NORMAL — teal
  };
  
  const barColor = getBarColor(activeTime);
  
  const timeDisplay = activeTime === Infinity || activeTime == null
    ? "—"
    : formatDemoTime(activeTime);

  // Resolve state from live timer — same thresholds as getBandFromTTL in Home
  const timerState = activeTime <= 4 ? "IMMEDIATE_RISK" : activeTime <= 13 ? "SEVERE_DRIFT" : activeTime <= 35 ? "EARLY_DRIFT" : "NORMAL";
  const activeState = demoState || timerState;
  // Resolve actual escalationLevel from activeState for lever relationship logic
  const activeEscalation = activeState === "IMMEDIATE_RISK" ? 3 : activeState === "SEVERE_DRIFT" ? 2 : activeState === "EARLY_DRIFT" ? 1 : escalationLevel;
  
  // Determine primary operating limit
  const getPrimaryConstraint = () => {
    if (timerState === "IMMEDIATE_RISK") return "Primary operating limit: Immediate escalation — reactor approaching trip threshold";
    if (timerState === "SEVERE_DRIFT")   return "Primary operating limit: Effluent temperature approaching Hi-Hi alarm";
    if (timerState === "EARLY_DRIFT")    return "Primary operating limit: Reactor outlet temperature drifting toward High alarm";
    if (hotSpotRisk === "HIGH") {
      return "Primary operating limit: Reactor bed temperature imbalance approaching runaway threshold";
    }
    if (coolingCapacity === "SEVERELY_LIMITED" && escalationLevel >= 2) {
      return "Primary operating limit: Effluent cooler heat removal capacity insufficient";
    }
    if (!equipment?.h2Compressor && escalationLevel >= 1) {
      return "Primary operating limit: Hydrogen quench system unavailable for moderation";
    }
    if (currentTemp >= 375 || escalationLevel >= 1) {
      return "Primary operating limit: Reactor outlet temperature approaching High alarm";
    }
    return null;
  };
  
  const primaryConstraint = getPrimaryConstraint();
  
  // Trend credibility statement
  const getTrendCredibility = () => {
    if (slope <= 0) return null;
    if (escalationLevel === 0 && !primaryConstraint) return null;
    
    if (slope > 2.0) {
      return "Trend confirmed: rapid sustained rate-of-rise over last 10 minutes";
    }
    if (slope > 1.5) {
      return "Trend confirmed: elevated rate-of-rise persisting over last 8 minutes";
    }
    if (slope > 0.8) {
      return "Trend confirmed: steady rate-of-rise over last 6 minutes";
    }
    if (slope > 0) {
      return "Trend observed: consistent upward movement detected";
    }
    return null;
  };
  
  const trendCredibility = getTrendCredibility();
  
  // Operating-limit lever relationship (explanatory only)
  const getConstraintLeverRelationship = () => {
    if (!primaryConstraint) return null;
    const hasCoolingHeadroom  = coolingCapacity !== "SEVERELY_LIMITED";
    const hasH2Availability   = equipment?.h2Compressor;
    const hasBypassFlexibility = equipment?.bypassValve;

    if (hasCoolingHeadroom && hasH2Availability && hasBypassFlexibility) {
      return "Mitigation flexibility available via cooling, hydrogen moderation, and bypass routing";
    }
    if (hasCoolingHeadroom && hasH2Availability) {
      return "Mitigation flexibility through cooling capacity and hydrogen moderation";
    }
    if (hasCoolingHeadroom) {
      return "Mitigation flexibility limited to remaining cooling capacity";
    }
    if (hasH2Availability) {
      return "Mitigation flexibility limited to hydrogen moderation authority";
    }
    return "Mitigation flexibility severely restricted — all primary levers constrained";
  };
  
  const constraintLeverRelationship = getConstraintLeverRelationship();
  
  const [expanded, setExpanded] = React.useState(false);
  
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-1.5 bg-[#1e1e1e] border border-[#333] rounded-lg px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-3.5 h-3.5 text-[#888]" />
            <span className="text-[#666] text-xs uppercase tracking-wider font-semibold">Decision Window</span>
          </div>
          <span className="text-[#aaa] text-sm font-semibold">{timeDisplay}</span>
        </div>
        <div className="w-full h-3 bg-[#0d0d0d] rounded-full border border-[#2a2a2a] overflow-hidden">
          <div 
            className="h-full transition-all duration-1500 ease-in-out rounded-full"
            style={{ 
              width: `${fillPercent}%`,
              backgroundColor: barColor,
            }}
          />
        </div>
      </div>
      
      {primaryConstraint && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2">
          <p className="text-[#aaa] text-xs leading-relaxed">{primaryConstraint}</p>
          {(trendCredibility || constraintLeverRelationship) && (
            <>
              <button 
                onClick={() => setExpanded(!expanded)}
                className="text-[#666] text-xs mt-1.5 hover:text-[#888] transition-colors"
              >
                {expanded ? "− Hide details" : "+ Show details"}
              </button>
              {expanded && (
                <div className="mt-2 space-y-1 pl-2 border-l-2 border-[#2a2a2a]">
                  {trendCredibility && (
                    <div className="flex items-start gap-2">
                      <TrendingUpIcon className="w-3.5 h-3.5 text-[#888] mt-0.5 flex-shrink-0" />
                      <p className="text-[#666] text-xs italic">{trendCredibility}</p>
                    </div>
                  )}
                  {constraintLeverRelationship && (
                    <p className="text-[#777] text-xs leading-relaxed">
                      {constraintLeverRelationship}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}