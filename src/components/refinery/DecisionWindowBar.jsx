import React from "react";
import { cn } from "@/lib/utils";

export default function DecisionWindowBar({ timeToNearest }) {
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
    </div>
  );
}