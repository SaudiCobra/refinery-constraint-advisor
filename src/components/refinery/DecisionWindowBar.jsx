import React from "react";
import { cn } from "@/lib/utils";

export default function DecisionWindowBar({ timeToNearest }) {
  // Compute bar fill percentage (cap at 30 minutes for visual scale)
  const maxTime = 30;
  const fillPercent = timeToNearest === Infinity || timeToNearest == null 
    ? 100 
    : Math.min(100, (timeToNearest / maxTime) * 100);
  
  // Determine color based on time
  const barColor = timeToNearest < 5 
    ? "#7A0F0F" 
    : timeToNearest < 10 
    ? "#A13A1F" 
    : "#0F5F5F";
  
  const timeDisplay = timeToNearest === Infinity || timeToNearest == null 
    ? "—" 
    : `${Math.round(timeToNearest)} min`;
  
  return (
    <div className="flex flex-col gap-2 bg-[#1e1e1e] border border-[#333] rounded-lg px-5 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[#666] text-xs uppercase tracking-wider">Decision Window</span>
        <span className="text-[#aaa] text-sm font-semibold">{timeDisplay}</span>
      </div>
      <div className="w-full h-3 bg-[#0d0d0d] rounded-full border border-[#2a2a2a] overflow-hidden">
        <div 
          className="h-full transition-all duration-1000 ease-out rounded-full"
          style={{ 
            width: `${fillPercent}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
}