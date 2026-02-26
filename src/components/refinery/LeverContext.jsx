import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

export default function LeverContext({
  equipment,
  coolingCapacity,
  escalationLevel,
  onMitigate,
  mitigationMsg,
  feedReductionActive,
  quenchBoostActive,
  coolingBoostActive,
}) {
  const [expanded, setExpanded] = React.useState(false);
  
  const levers = [
    {
      available: coolingCapacity !== "SEVERELY_LIMITED",
      label: "Cooling",
      description: "E-2 not saturated",
    },
    {
      available: equipment.h2Compressor,
      label: "Hydrogen",
      description: "H₂ availability not constrained",
    },
    {
      available: equipment.bypassValve,
      label: "Bypass",
      description: "Control valves operational",
    },
    {
      available: escalationLevel < 3,
      label: "Equipment limits",
      description: "Operating margin remains",
    },
  ];

  const availableCount = levers.filter(l => l.available).length;

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[#888] text-xs font-semibold uppercase tracking-wider">
          Operational Flexibility
        </h4>
        <span className={cn(
          "text-xs font-bold px-2 py-0.5 rounded",
          availableCount >= 3 && "bg-[#0F5F5F]/50 text-[#0F9F9F]",
          availableCount === 2 && "bg-[#B47A1F]/50 text-[#D4A547]",
          availableCount <= 1 && "bg-[#A13A1F]/50 text-[#D4653F]"
        )}>
          {availableCount} / 4 available
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {levers.map((lever, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            {lever.available ? (
              <CheckCircle2 className="w-3 h-3 text-[#0F9F9F] flex-shrink-0" />
            ) : (
              <span className="w-3 h-3 rounded-full border border-[#555] flex-shrink-0" />
            )}
            <span className={cn(
              "text-xs",
              lever.available ? "text-[#aaa]" : "text-[#666] line-through"
            )}>
              {lever.label}
            </span>
          </div>
        ))}
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#2a2a2a] space-y-1.5">
          {levers.map((lever, idx) => (
            lever.available && (
              <p key={idx} className="text-[#777] text-xs">• {lever.description}</p>
            )
          ))}
        </div>
      )}

      <button 
        onClick={() => setExpanded(!expanded)}
        className="text-[#666] text-xs mt-2 hover:text-[#888] transition-colors"
      >
        {expanded ? "− Hide details" : "+ Show details"}
      </button>

      {/* Corrective action buttons — interactive mode only */}
      {onMitigate && (
        <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
          <p className="text-[#666] text-[10px] uppercase tracking-wider mb-2 font-semibold">Corrective Actions</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onMitigate("feedReduction")}
              className="px-3 py-1.5 rounded border border-[#444] text-[#aaa] text-xs hover:border-[#E67E22] hover:text-[#E67E22] transition-all duration-200"
            >
              ↓ Feed Reduction
            </button>
            <button
              onClick={() => onMitigate("quench")}
              className="px-3 py-1.5 rounded border border-[#444] text-[#aaa] text-xs hover:border-[#4A90E2] hover:text-[#4A90E2] transition-all duration-200"
            >
              ↑ Increase Quench
            </button>
            <button
              onClick={() => onMitigate("cooling")}
              className="px-3 py-1.5 rounded border border-[#444] text-[#aaa] text-xs hover:border-[#0F7F7F] hover:text-[#0F9F9F] transition-all duration-200"
            >
              ↑ Boost Cooling
            </button>
          </div>
          {mitigationMsg && (
            <p className="text-[#E67E22] text-xs mt-2 italic">{mitigationMsg}</p>
          )}
        </div>
      )}
    </div>
  );
}