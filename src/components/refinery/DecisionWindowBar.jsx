import React from "react";
import { cn } from "@/lib/utils";

export default function DecisionWindowBar({ 
  timeToNearest, 
  escalationLevel,
  coolingCapacity,
  equipment,
  hotSpotRisk,
  slope,
  currentTemp,
}) {
  // Compute bar fill percentage (cap at 30 minutes for visual scale)
  const maxTime = 30;
  const fillPercent = timeToNearest === Infinity || timeToNearest == null 
    ? 100 
    : Math.min(100, (timeToNearest / maxTime) * 100);
  
  // Gradient color based on time with smooth transitions
  const getBarColor = (time) => {
    if (time === Infinity || time == null) return "#3a3a3a";
    if (time < 5) return "#7A0F0F"; // Deep crimson
    if (time < 10) return "#A13A1F"; // Burnt orange
    if (time < 20) return "#B47A1F"; // Amber
    return "#3a3a3a"; // Neutral grey
  };
  
  const barColor = getBarColor(timeToNearest);
  
  const timeDisplay = timeToNearest === Infinity || timeToNearest == null 
    ? "—" 
    : `${Math.round(timeToNearest)} min`;
  
  // Determine primary constraint
  const getPrimaryConstraint = () => {
    if (hotSpotRisk === "HIGH") {
      return "Primary constraint: Reactor bed temperature imbalance approaching runaway threshold";
    }
    if (coolingCapacity === "CONSTRAINED" && escalationLevel >= 2) {
      return "Primary constraint: Effluent cooler heat removal capacity insufficient";
    }
    if (!equipment?.h2Compressor && escalationLevel >= 1) {
      return "Primary constraint: Hydrogen quench system unavailable for moderation";
    }
    if (currentTemp >= 375) {
      return "Primary constraint: Reactor outlet temperature approaching high limit";
    }
    if (slope > 2.0) {
      return "Primary constraint: Temperature rise rate exceeding normal operating envelope";
    }
    if (escalationLevel >= 1) {
      return "Primary constraint: Reactor outlet temperature approaching high limit";
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
  
  return (
    <div className="flex flex-col gap-2 bg-[#1e1e1e] border border-[#333] rounded-lg px-5 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[#666] text-xs uppercase tracking-wider font-semibold">Decision Window</span>
        <span className="text-[#aaa] text-base font-semibold">{timeDisplay}</span>
      </div>
      <div className="w-full h-4 bg-[#0d0d0d] rounded-full border border-[#2a2a2a] overflow-hidden">
        <div 
          className="h-full transition-all duration-1500 ease-in-out rounded-full"
          style={{ 
            width: `${fillPercent}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
      {primaryConstraint && (
        <div className="pt-1 border-t border-[#2a2a2a] space-y-1">
          <p className="text-[#999] text-sm leading-relaxed">{primaryConstraint}</p>
          {trendCredibility && (
            <p className="text-[#666] text-xs italic">{trendCredibility}</p>
          )}
        </div>
      )}
    </div>
  );
}