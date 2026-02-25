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
    if (coolingCapacity === "SEVERELY_LIMITED" && escalationLevel >= 2) {
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
  
  // Constraint-lever relationship (explanatory only)
  const getConstraintLeverRelationship = () => {
    if (!primaryConstraint) return null;
    
    // Check available flexibility
    const hasCoolingHeadroom = coolingCapacity !== "SEVERELY_LIMITED";
    const hasH2Availability = equipment?.h2Compressor;
    const hasBypassFlexibility = equipment?.bypassValve;
    
    // Build contextual explanation based on constraint and available levers
    if (hotSpotRisk === "HIGH") {
      if (hasH2Availability && hasCoolingHeadroom) {
        return "Mitigation flexibility exists due to hydrogen moderation headroom and available cooling capacity";
      }
      if (hasH2Availability) {
        return "Limited mitigation flexibility exists due to hydrogen moderation capability, though cooling capacity severely limited";
      }
      return "Mitigation flexibility severely restricted due to hydrogen system unavailability and cooling constraints";
    }
    
    if (coolingCapacity === "SEVERELY_LIMITED") {
      if (hasH2Availability && hasBypassFlexibility) {
        return "Alternative response flexibility exists through hydrogen moderation and bypass routing adjustment";
      }
      if (hasH2Availability) {
        return "Response flexibility exists primarily through hydrogen moderation authority";
      }
      return "Response flexibility severely restricted with cooling and hydrogen systems constrained";
    }
    
    if (!equipment?.h2Compressor) {
      if (hasCoolingHeadroom && hasBypassFlexibility) {
        return "Response flexibility exists through cooling capacity and bypass routing, though hydrogen moderation unavailable";
      }
      if (hasCoolingHeadroom) {
        return "Response flexibility limited primarily to cooling capacity adjustment";
      }
      return "Response flexibility severely restricted with hydrogen and cooling systems constrained";
    }
    
    // Temperature-based constraints
    if (currentTemp >= 375 || escalationLevel >= 1) {
      if (hasCoolingHeadroom && hasH2Availability && hasBypassFlexibility) {
        return "Available mitigation flexibility exists due to remaining cooling capacity and hydrogen moderation headroom";
      }
      if (hasCoolingHeadroom && hasH2Availability) {
        return "Mitigation flexibility exists through cooling and hydrogen moderation, bypass routing limited";
      }
      if (hasCoolingHeadroom) {
        return "Mitigation flexibility exists primarily through remaining cooling capacity";
      }
      if (hasH2Availability) {
        return "Mitigation flexibility exists primarily through hydrogen moderation capability";
      }
      return "Mitigation flexibility severely restricted due to equipment and capacity constraints";
    }
    
    return null;
  };
  
  const constraintLeverRelationship = getConstraintLeverRelationship();
  
  const [expanded, setExpanded] = React.useState(false);
  
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-1.5 bg-[#1e1e1e] border border-[#333] rounded-lg px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[#666] text-xs uppercase tracking-wider font-semibold">Decision Window</span>
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
                    <p className="text-[#666] text-xs italic">{trendCredibility}</p>
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