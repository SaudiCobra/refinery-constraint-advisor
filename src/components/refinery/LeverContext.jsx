import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

// Action preview definitions — static content + dynamic projection hook
const ACTION_PREVIEWS = {
  feedReduction: {
    title: "Feed Reduction",
    effects: [
      "Reactor heat release drops",
      "Temperature rise slows materially",
    ],
    projection: () => "Time to limit increases strongly",
    stateShift: () => "Best first move when drift is building",
  },
  quench: {
    title: "Quench Boost",
    effects: [
      "Hydrogen quench cooling increases",
      "Reactor temperature eases slightly",
    ],
    projection: () => "Time to limit increases moderately",
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
  const [hoveredAction, setHoveredAction] = React.useState(null);
  // Debounce clear so moving between buttons doesn't flash the preview off/on
  const clearTimerRef = React.useRef(null);

  const handleEnter = (action) => {
    if (clearTimerRef.current) { clearTimeout(clearTimerRef.current); clearTimerRef.current = null; }
    setHoveredAction(action);
  };
  const handleLeave = () => {
    clearTimerRef.current = setTimeout(() => setHoveredAction(null), 100);
  };
  
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

          {/* Wrapper: enter/leave on wrapper with debounce — buttons never fire leave */}
          <div onMouseLeave={handleLeave}>
            {/* Button row — always first, no top spacer */}
            <div className="flex flex-wrap gap-2">
              {/* Feed Reduction */}
              <div className="flex flex-col items-start gap-0.5">
                <button
                  onClick={() => onMitigate("feedReduction")}
                  onMouseEnter={() => handleEnter("feedReduction")}
                  className={cn(
                    "px-3 py-1.5 rounded border text-xs transition-colors duration-150",
                    feedReductionActive
                      ? "border-[#E67E22] text-[#E67E22] bg-[#E67E22]/10"
                      : "border-[#444] text-[#aaa] hover:border-[#E67E22] hover:text-[#E67E22]"
                  )}
                >
                  {feedReductionActive ? "✓ " : "↓ "}Feed Reduction
                </button>
                {feedReductionActive && rampProgress && (() => {
                  const pct = rampProgress.feed ?? 0;
                  const label = pct === 0 ? "Commanded" : pct < 100 ? `Building (${Math.round(pct)}%)` : "Full (100%)";
                  const color = pct < 100 ? "#E67E22" : "#0F9F9F";
                  return <span className="text-[10px] pl-0.5" style={{ color }}>{label}</span>;
                })()}
              </div>

              {/* Quench Boost */}
              <div className="flex flex-col items-start gap-0.5">
                <button
                  onClick={() => onMitigate("quench")}
                  onMouseEnter={() => handleEnter("quench")}
                  className={cn(
                    "px-3 py-1.5 rounded border text-xs transition-colors duration-150",
                    quenchBoostActive
                      ? "border-[#4A90E2] text-[#4A90E2] bg-[#4A90E2]/10"
                      : "border-[#444] text-[#aaa] hover:border-[#4A90E2] hover:text-[#4A90E2]"
                  )}
                >
                  {quenchBoostActive ? "✓ " : "↑ "}Quench Boost
                </button>
                {quenchBoostActive && rampProgress && (() => {
                  const pct = rampProgress.h2 ?? 0;
                  const label = pct === 0 ? "Commanded" : pct < 100 ? `Building (${Math.round(pct)}%)` : "Full (100%)";
                  const color = pct < 100 ? "#E67E22" : "#0F9F9F";
                  return <span className="text-[10px] pl-0.5" style={{ color }}>{label}</span>;
                })()}
              </div>

              {/* Cooling Boost */}
              <div className="flex flex-col items-start gap-0.5">
                <button
                  onClick={() => onMitigate("cooling")}
                  onMouseEnter={() => handleEnter("cooling")}
                  className={cn(
                    "px-3 py-1.5 rounded border text-xs transition-colors duration-150",
                    coolingBoostActive
                      ? "border-[#0F9F9F] text-[#0F9F9F] bg-[#0F9F9F]/10"
                      : "border-[#444] text-[#aaa] hover:border-[#0F7F7F] hover:text-[#0F9F9F]"
                  )}
                >
                  {coolingBoostActive ? "✓ " : "↑ "}Cooling Boost
                </button>
                {coolingBoostActive && rampProgress && (() => {
                  const pct = rampProgress.cooling ?? 0;
                  const label = pct === 0 ? "Commanded" : pct < 100 ? `Building (${Math.round(pct)}%)` : "Full (100%)";
                  const color = pct < 100 ? "#E67E22" : "#0F9F9F";
                  return <span className="text-[10px] pl-0.5" style={{ color }}>{label}</span>;
                })()}
              </div>
            </div>

            {/* Preview panel BELOW buttons — fixed min-height prevents layout jump.
                pointer-events:none so it can never steal cursor from buttons. */}
            <div style={{ minHeight: 88, marginTop: 8, pointerEvents: "none" }}>
              {hoveredAction && ACTION_PREVIEWS[hoveredAction] && (() => {
                const preview = ACTION_PREVIEWS[hoveredAction];
                return (
                  <div className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-lg p-3">
                    <p className="text-[#555] text-[10px] uppercase tracking-wider font-semibold mb-1">Action Preview · {preview.title}</p>
                    {preview.effects.map((e, i) => (
                      <p key={i} className="text-[#888] text-xs">• {e}</p>
                    ))}
                    <div className="mt-1.5 pt-1.5 border-t border-[#1e1e1e]">
                      <p className="text-[#3FC9B0] text-xs">{preview.projection(coolingCapacity)}</p>
                      <p className="text-[#555] text-[10px] mt-0.5">{preview.stateShift(coolingCapacity)}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Mitigation response — always present, never disappears */}
          {(() => {
            const anyActive = feedReductionActive || quenchBoostActive || coolingBoostActive;
            const allFull = anyActive && [
              feedReductionActive ? (rampProgress?.feed ?? 0) : 100,
              quenchBoostActive   ? (rampProgress?.h2   ?? 0) : 100,
              coolingBoostActive  ? (rampProgress?.cooling ?? 0) : 100,
            ].every(p => p >= 100);

            let statusText;
            if (!anyActive) {
              statusText = <span className="text-[#3a3a3a]">Mitigation response: Standing by</span>;
            } else if (allFull) {
              statusText = <span className="text-[#0F9F9F]">Mitigation response: All levers at full effect — stabilizing</span>;
            } else if (mitigationMsg) {
              statusText = <span className="text-[#E67E22]">{mitigationMsg}</span>;
            } else {
              statusText = <span className="text-[#888]">Mitigation response: Building…</span>;
            }

            return (
              <p className="text-[10px] mt-2" style={{ minHeight: "1.4em" }}>
                {statusText}
                {anyActive && minutesRecovered > 0.3 && (
                  <span className="text-[#555] ml-2">+{Math.min(minutesRecovered, 30).toFixed(1)} min recovered</span>
                )}
              </p>
            );
          })()}
        </div>
      )}
    </div>
  );
}