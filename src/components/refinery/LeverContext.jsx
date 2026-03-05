import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

// Action preview definitions — static content + dynamic projection hook
const ACTION_PREVIEWS = {
  feedReduction: {
    title: "Feed Reduction",
    effects: [
      "Reactor heat release reduced",
      "Temperature slope slows",
    ],
    projection: (coolingCapacity) => "Time to limit increases moderately",
    stateShift: (coolingCapacity) => "Improves margin across all states",
  },
  quench: {
    title: "Quench Boost",
    effects: [
      "Hydrogen quench cooling increases",
      "Reactor temperature drops slightly",
    ],
    projection: () => "Time to limit increases significantly",
    stateShift: () => "Most effective at Severe Drift and above",
  },
  cooling: {
    title: "Cooling Boost",
    effects: [
      "Effluent heat removal improves",
      "Reactor outlet temperature stabilizes",
    ],
    projection: (coolingCapacity) =>
      coolingCapacity === "CONSTRAINED" || coolingCapacity === "SEVERELY_LIMITED"
        ? "Limited — cooling already constrained"
        : "Largest improvement when cooling is available",
    stateShift: () => "Best combined with feed reduction",
  },
};

export default function LeverContext({
  equipment,
  coolingCapacity,
  escalationLevel,
  onMitigate,
  mitigationMsg,
  feedReductionActive,
  quenchBoostActive,
  coolingBoostActive,
  rampProgress,       // { feed: 0-100, h2: 0-100, cooling: 0-100 }
  minutesRecovered,   // number | null
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

      {/* Corrective action toggles — interactive mode only */}
      {onMitigate && (
        <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
          <p className="text-[#666] text-[10px] uppercase tracking-wider mb-2 font-semibold">Corrective Actions</p>

          {/* Helper: derive per-lever status label from rampProgress */}
          {(() => {
            const getLeverStatus = (isActive, pct) => {
              if (!isActive) return { label: "Idle", color: "#444" };
              if (pct === 0)   return { label: "Commanded", color: "#aaa" };
              if (pct < 100)   return { label: `Building (${Math.round(pct)}%)`, color: "#E67E22" };
              return { label: "Full (100%)", color: "#0F9F9F" };
            };

            const feedStatus    = getLeverStatus(feedReductionActive, rampProgress?.feed    ?? 0);
            const quenchStatus  = getLeverStatus(quenchBoostActive,   rampProgress?.h2      ?? 0);
            const coolingStatus = getLeverStatus(coolingBoostActive,  rampProgress?.cooling ?? 0);

            return (
              <div className="flex flex-wrap gap-2">
                {/* Feed Reduction */}
                <div className="flex flex-col items-start gap-0.5">
                  <button
                    onClick={() => onMitigate("feedReduction")}
                    className={cn(
                      "px-3 py-1.5 rounded border text-xs transition-all duration-200",
                      feedReductionActive
                        ? "border-[#E67E22] text-[#E67E22] bg-[#E67E22]/10"
                        : "border-[#444] text-[#aaa] hover:border-[#E67E22] hover:text-[#E67E22]"
                    )}
                  >
                    {feedReductionActive ? "✓ " : "↓ "}Feed Reduction
                  </button>
                  <span className="text-[10px] pl-0.5" style={{ color: feedStatus.color }}>{feedStatus.label}</span>
                </div>

                {/* Quench Boost */}
                <div className="flex flex-col items-start gap-0.5">
                  <button
                    onClick={() => onMitigate("quench")}
                    className={cn(
                      "px-3 py-1.5 rounded border text-xs transition-all duration-200",
                      quenchBoostActive
                        ? "border-[#4A90E2] text-[#4A90E2] bg-[#4A90E2]/10"
                        : "border-[#444] text-[#aaa] hover:border-[#4A90E2] hover:text-[#4A90E2]"
                    )}
                  >
                    {quenchBoostActive ? "✓ " : "↑ "}Quench Boost
                  </button>
                  <span className="text-[10px] pl-0.5" style={{ color: quenchStatus.color }}>{quenchStatus.label}</span>
                </div>

                {/* Cooling Boost */}
                <div className="flex flex-col items-start gap-0.5">
                  <button
                    onClick={() => onMitigate("cooling")}
                    className={cn(
                      "px-3 py-1.5 rounded border text-xs transition-all duration-200",
                      coolingBoostActive
                        ? "border-[#0F9F9F] text-[#0F9F9F] bg-[#0F9F9F]/10"
                        : "border-[#444] text-[#aaa] hover:border-[#0F7F7F] hover:text-[#0F9F9F]"
                    )}
                  >
                    {coolingBoostActive ? "✓ " : "↑ "}Cooling Boost
                  </button>
                  <span className="text-[10px] pl-0.5" style={{ color: coolingStatus.color }}>{coolingStatus.label}</span>
                </div>
              </div>
            );
          })()}

          {mitigationMsg && (
            <p className="text-[#E67E22] text-xs mt-2 italic">{mitigationMsg}</p>
          )}

          {/* Overall mitigation response summary */}
          {rampProgress && (() => {
            const activeProgresses = [
              feedReductionActive ? rampProgress.feed : null,
              quenchBoostActive   ? rampProgress.h2   : null,
              coolingBoostActive  ? rampProgress.cooling : null,
            ].filter(p => p !== null);

            if (activeProgresses.length === 0) return (
              <p className="text-[#444] text-[10px] mt-2">Mitigation response: Idle</p>
            );

            const allFull = activeProgresses.every(p => p >= 100);
            return (
              <div className="mt-2 space-y-0.5">
                {minutesRecovered > 0.3 && (
                  <p className="text-[#555] text-[10px]">
                    Minutes recovered: <span className="text-[#7DBF9E]">+{Math.min(minutesRecovered, 30).toFixed(1)} min</span>
                  </p>
                )}
                {allFull && (
                  <p className="text-[#0F9F9F] text-[10px]">All levers at full effect — stabilizing</p>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}