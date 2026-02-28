import React, { useState, useEffect, useRef } from "react";
import { X, ArrowUp, ArrowDown, Minus } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(min) {
  if (!isFinite(min) || min > 999) return "> 60 min";
  if (min <= 0) return "< 1 min";
  if (min < 1) return "< 1 min";
  return `${Math.round(min)} min`;
}

function fmtRoR(ror) {
  return `${ror >= 0 ? "+" : ""}${ror.toFixed(2)} °C/min`;
}

const SEVERITY_COLOR = {
  NORMAL:         "#3FC9B0",
  EARLY_DRIFT:    "#D9A441",
  SEVERE_DRIFT:   "#E06A2C",
  IMMEDIATE_RISK: "#E14B3B",
};

// Glow + halo per state (M19)
const STATE_GLOW = {
  NORMAL:         { glow: 0.45, halo: 0.35 },
  EARLY_DRIFT:    { glow: 0.55, halo: 0.45 },
  SEVERE_DRIFT:   { glow: 0.75, halo: 0.65 },
  IMMEDIATE_RISK: { glow: 0.90, halo: 0.85 },
};

// ── Dominant driver ───────────────────────────────────────────────────────────

function getDominantDriver(slope, coolingCapacity, equipment, systemState) {
  if (systemState === "IMMEDIATE_RISK") {
    return "Quench valve unresponsive — temperature control authority degraded.";
  }
  const drivers = [];
  if (slope > 1.0) drivers.push({ label: "rising rate-of-rise", weight: slope });
  if (coolingCapacity === "SEVERELY_LIMITED") drivers.push({ label: "severely limited cooling capacity", weight: 3 });
  else if (coolingCapacity === "REDUCED") drivers.push({ label: "reduced cooling margin", weight: 2 });
  if (!equipment?.effluentCooler) drivers.push({ label: "effluent cooler unavailable", weight: 2 });
  if (systemState === "SEVERE_DRIFT" && !drivers.some(d => d.label.includes("rate"))) {
    drivers.push({ label: "sustained high rate-of-rise", weight: 1.5 });
  }
  if (drivers.length === 0) return "No dominant risk driver identified at current operating point.";
  drivers.sort((a, b) => b.weight - a.weight);
  if (drivers.length === 1) return `Risk driven primarily by ${drivers[0].label}.`;
  return `Risk driven primarily by ${drivers[0].label} and ${drivers[1].label}.`;
}

// ── Operator advantage insight ────────────────────────────────────────────────

function getOperatorAdvantage(timeToNearest, slope, coolingCapacity, equipment, feedActive, coolingActive) {
  if (timeToNearest > 60) return "System stable. Monitor normal operating limits.";
  if (timeToNearest > 35) {
    if (!feedActive && !coolingActive) return "Mitigation levers available—early action preferred.";
    return "Current mitigation sufficient. Continue monitoring.";
  }
  if (timeToNearest > 13) {
    if (coolingCapacity === "SEVERELY_LIMITED") return "Cooling offline. Prioritize feed reduction immediately.";
    if (!equipment?.effluentCooler) return "Cooling unavailable. Feed reduction is primary lever.";
    return "Multiple levers active. Assess combined effect.";
  }
  if (timeToNearest > 4) {
    if (slope < 0.5) return "Rate-of-rise slowing. Intervention is taking effect.";
    return "High rate-of-rise despite mitigation. Escalating.";
  }
  return "Critical window. All available levers should be active.";
}

// ── Ranked actions with bar widths ────────────────────────────────────────────

function getRankedActions(slope, coolingCapacity, equipment, rampProgress, feedActive, h2Active, coolingActive) {
  const coolingAvail = coolingCapacity !== "SEVERELY_LIMITED" && equipment?.effluentCooler !== false;
  const h2Avail = equipment?.h2Compressor !== false;

  const items = [
    {
      key: "feed",
      label: "Feed reduction",
      score: 25,
      strengthLabel: "Strong",
      barFill: 0.80,
      active: feedActive,
      available: true,
      pct: feedActive ? Math.round(rampProgress?.feed ?? 0) : null,
    },
    {
      key: "cooling",
      label: "Cooling boost",
      score: coolingAvail ? 22 : 6,
      strengthLabel: coolingAvail ? "Moderate" : "Limited",
      barFill: coolingAvail ? 0.58 : 0.18,
      active: coolingActive,
      available: coolingAvail,
      pct: coolingActive ? Math.round(rampProgress?.cooling ?? 0) : null,
    },
    {
      key: "h2",
      label: "Hydrogen quench",
      score: h2Avail ? 18 : 3,
      strengthLabel: h2Avail ? "Mild" : "Unavailable",
      barFill: h2Avail ? 0.38 : 0.08,
      active: h2Active,
      available: h2Avail,
      pct: h2Active ? Math.round(rampProgress?.h2 ?? 0) : null,
    },
  ];

  items.sort((a, b) => {
    const s = o => o.active ? o.score + 40 : o.score;
    return s(b) - s(a);
  });

  return items;
}

// ── Scenario evaluation ───────────────────────────────────────────────────────

const EVAL_SCENARIOS = [
  { value: "feed5",    label: "5% feed reduction",   rorReduction: 0.08 },
  { value: "feed10",   label: "10% feed reduction",  rorReduction: 0.15 },
  { value: "h2plus",   label: "+5% hydrogen",         rorReduction: 0.07 },
  { value: "cooling",  label: "Cooling boost",        rorReduction: 0.18 },
  { value: "combined", label: "Combined mitigation",  rorReduction: 0.38 },
];

function projectTTL(timeToNearest, slope, rorReduction) {
  const projectedSlope = Math.max(0.03, slope * (1 - rorReduction));
  const margin = slope > 0 ? slope * timeToNearest : 0;
  const projected = projectedSlope > 0 ? margin / projectedSlope : Infinity;
  return Math.min(projected, 120);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Divider({ isLargeDisplay }) {
  return <div style={{ borderTop: "1px solid #1e1e1e", margin: isLargeDisplay ? "12px 0" : "10px 0" }} />;
}

function Label({ children, fs }) {
  return (
    <p style={{ fontSize: fs(9), letterSpacing: "0.04em", textTransform: "uppercase", color: "#4a4a4a", fontWeight: 500, marginBottom: 6 }}>
      {children}
    </p>
  );
}

function Row({ label, value, valueColor, emergency, fs }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: emergency ? 8 : 4 }}>
      <span style={{ fontSize: emergency ? fs(12) : fs(11), color: emergency ? "#888" : "#666", fontWeight: emergency ? 500 : 400 }}>{label}</span>
      <span style={{ fontSize: emergency ? fs(18) : fs(12), fontFamily: "monospace", color: valueColor || "#c0c0c0", fontWeight: emergency ? 700 : 600, letterSpacing: emergency ? "0.02em" : "normal" }}>{value}</span>
    </div>
  );
}

function TrajectoryBar({ slope, fs, isLargeDisplay, stateKey }) {
  const position = Math.min(1, Math.max(0, slope / 2.0));
  const posPercent = Math.round(position * 100);

  let ArrowIcon = Minus;
  if (slope > 0.5) ArrowIcon = ArrowUp;
  else if (slope < -0.5) ArrowIcon = ArrowDown;

  const isImmediate = stateKey === "IMMEDIATE_RISK";
  const isSevere    = stateKey === "SEVERE_DRIFT";
  const isEarly     = stateKey === "EARLY_DRIFT";

  // Shimmer opacity by state
  const shimmerOpacity = isImmediate ? 0.12 : isSevere ? 0.12 : isEarly ? 0.06 : 0;
  const shimmerActive  = shimmerOpacity > 0;

  // Gradient contrast boost for Immediate
  const barGradient = isImmediate
    ? "linear-gradient(90deg, #1fc4a8 0%, #e0a030 45%, #E14B3B 100%)"
    : "linear-gradient(90deg, #3FC9B0 0%, #D9A441 50%, #E06A2C 100%)";

  const shimmerAnimId = `traj-shimmer-${stateKey.toLowerCase()}`;

  return (
    <div style={{ marginBottom: isLargeDisplay ? 10 : 8 }}>
      {shimmerActive && (
        <style>{`
          @keyframes ${shimmerAnimId} {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(400%); }
          }
          .traj-shimmer-${stateKey.toLowerCase()} {
            animation: ${shimmerAnimId} 4s linear infinite;
          }
        `}</style>
      )}
      <p style={{ fontSize: fs(9), letterSpacing: "0.04em", textTransform: "uppercase", color: "#4a4a4a", fontWeight: 500, marginBottom: 4 }}>
        Risk Trajectory
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div
          style={{
            flex: 1,
            height: 8,
            borderRadius: 3,
            background: barGradient,
            position: "relative",
            overflow: "hidden",
            transition: "background 0.3s ease",
          }}
        >
          {/* Directional shimmer layer */}
          {shimmerActive && (
            <div
              className={`traj-shimmer-${stateKey.toLowerCase()}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "25%",
                height: "100%",
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,1) 50%, transparent 100%)",
                opacity: shimmerOpacity,
                pointerEvents: "none",
              }}
            />
          )}
          {/* Position indicator */}
          <div
            style={{
              position: "absolute",
              left: `${posPercent}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 3,
              height: 12,
              background: "#fff",
              borderRadius: 1,
              boxShadow: "0 0 4px rgba(0,0,0,0.4)",
              zIndex: 2,
            }}
          />
        </div>
        <ArrowIcon style={{ width: fs(14), height: fs(14), color: "#888", flexShrink: 0 }} />
      </div>
    </div>
  );
}

function ImpactBar({ label, barFill, strengthLabel, active, available, pct, fs, isLargeDisplay }) {
  const TOTAL_BLOCKS = 9;
  const filled = Math.round(barFill * TOTAL_BLOCKS);
  const barColor = !available ? "#2a2a2a"
    : strengthLabel === "Strong"    ? "#3FC9B0"
    : strengthLabel === "Moderate"  ? "#D9A441"
    : strengthLabel === "Mild"      ? "#6a6a6a"
    : "#2a2a2a";

  const labelColor = !available ? "#3a3a3a" : active ? "#ddd" : "#888";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: fs(11), color: labelColor, width: 120, flexShrink: 0, fontWeight: 450, lineHeight: 1.5 }}>
        {label}
        {active && pct !== null && <span style={{ fontSize: fs(9), color: "#555", marginLeft: 4 }}>[{pct}%]</span>}
      </span>
      <div style={{ display: "flex", gap: 2, flex: 1 }}>
        {Array.from({ length: TOTAL_BLOCKS }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 6,
              flex: 1,
              borderRadius: 2,
              background: i < filled ? barColor : "#1e1e1e",
              opacity: i < filled ? (active ? 1 : 0.65) : 1,
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: fs(10), color: !available ? "#3a3a3a" : barColor, width: 62, textAlign: "right", flexShrink: 0 }}>
        {strengthLabel}
      </span>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

function useResponsivePanel() {
  const [vw, setVw] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setVw(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  const basePanelWidth = vw > 3200 ? 760 : vw > 2560 ? 680 : 420;
  const panelWidth = Math.round(basePanelWidth * 1.08);
  const fontScale   = vw > 2560 ? 1.08 : 1.0;
  const isLargeDisplay = vw > 2560;
  const panelPadding = isLargeDisplay ? "24px 19px 14px" : "24px 17px 13px";
  const sectionMargin = isLargeDisplay ? "18px 0" : "18px 0";
  return { panelWidth, fontScale, isLargeDisplay, panelPadding, sectionMargin };
}

export default function ManarahPanel({
  open,
  systemState,
  timeToNearest,
  slope,
  coolingCapacity,
  equipment,
  rampProgress,
  feedReductionActive,
  quenchBoostActive,
  coolingBoostActive,
  onAutoOpen,
  onClose,
  beacon,
}) {
  const [evalScenario, setEvalScenario] = useState("");
  const [autoOpenedImmediate, setAutoOpenedImmediate] = useState(false);
  const { panelWidth, fontScale, isLargeDisplay, panelPadding, sectionMargin } = useResponsivePanel();

  const stateKey = (systemState || "NORMAL").toUpperCase().replace(/\s+/g, "_");
  const isImmediate = stateKey === "IMMEDIATE_RISK";
  const isSevere = stateKey === "SEVERE_DRIFT";

  // Auto-open once when entering IMMEDIATE_RISK from other states
  useEffect(() => {
    if (isImmediate && !autoOpenedImmediate && !open) {
      setAutoOpenedImmediate(true);
      if (onAutoOpen) onAutoOpen();
    } else if (!isImmediate) {
      setAutoOpenedImmediate(false);
    }
  }, [isImmediate, open, autoOpenedImmediate, onAutoOpen]);

  if (!open) return null;

  const severityColor = SEVERITY_COLOR[stateKey] || "#0F9F9F";
  const fs = (base) => Math.round(base * fontScale);
  const adjustedPanelWidth = Math.round(panelWidth * (isImmediate ? 1.18 : 1.0));
  const dividerId = `div-${stateKey.toLowerCase()}`;

  const ttlToSevere    = timeToNearest > 13 ? timeToNearest - 13 : 0;
  const ttlToImmediate = timeToNearest > 4  ? timeToNearest - 4  : 0;

  const dominantDriver = getDominantDriver(slope, coolingCapacity, equipment, stateKey);
  const rankedActions  = getRankedActions(slope, coolingCapacity, equipment, rampProgress, feedReductionActive, quenchBoostActive, coolingBoostActive);

  const ttlColor = timeToNearest <= 4 ? "#E14B3B" : timeToNearest <= 13 ? "#E06A2C" : timeToNearest <= 35 ? "#D9A441" : "#3FC9B0";
  const isEmergency = stateKey === "SEVERE_DRIFT" || stateKey === "IMMEDIATE_RISK";

  const evalResult = evalScenario
    ? (() => {
        const sc = EVAL_SCENARIOS.find(s => s.value === evalScenario);
        const projected = projectTTL(timeToNearest, slope, sc.rorReduction);
        const gain = projected - timeToNearest;
        return { projected, gain };
      })()
    : null;

  return (
    <>
      <style>{`
        @keyframes manarah-open {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes manarah-content-1 {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .manarah-panel {
          animation: manarah-open 280ms cubic-bezier(0.32, 0.72, 0.36, 1) forwards;
        }
        .manarah-panel > * {
          opacity: 0;
          animation: manarah-content-1 160ms ease forwards;
        }
        .manarah-panel > *:nth-child(1) { animation-delay: 0ms;   }
        .manarah-panel > *:nth-child(2) { animation-delay: 40ms;  }
        .manarah-panel > *:nth-child(3) { animation-delay: 60ms;  }
        .manarah-section-metrics  { opacity: 0; animation: manarah-content-1 160ms ease 60ms forwards; }
        .manarah-section-actions  { opacity: 0; animation: manarah-content-1 160ms ease 120ms forwards; }
      `}</style>

      {/* Light gradient link from beacon to panel (large displays only) */}
      {isLargeDisplay && (
        <div
          style={{
            position: "fixed",
            bottom: 40,
            right: 20,
            width: 2,
            height: 56,
            zIndex: 9997,
            background: `linear-gradient(180deg, ${severityColor} 0%, ${severityColor} 20%, transparent 100%)`,
            opacity: 0.12,
            pointerEvents: "none",
            borderRadius: 1,
          }}
        />
      )}

      <div
        className="manarah-panel"
        data-manarah-panel
        style={{
          position: "fixed",
          bottom: 96,
          right: 20,
          width: adjustedPanelWidth,
          maxHeight: "70vh",
          zIndex: 9998,
          background: isLargeDisplay ? "rgba(14,14,14,0.92)" : "#0e0e0e",
          backdropFilter: isLargeDisplay ? "blur(6px)" : "none",
          WebkitBackdropFilter: isLargeDisplay ? "blur(6px)" : "none",
          border: "1px solid #222",
          borderLeft: isSevere ? "2px solid rgba(224,106,44,0.65)" : isImmediate ? "2px solid rgba(225,75,59,0.75)" : "1px solid #222",
          borderRadius: 10,
          boxShadow: isImmediate
            ? (isLargeDisplay
              ? "0 32px 80px rgba(0,0,0,0.82), 0 0 0 1px rgba(255,255,255,0.05), 0 0 32px rgba(225,75,59,0.22)"
              : "0 18px 52px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03), 0 0 24px rgba(225,75,59,0.18)")
            : isSevere
            ? (isLargeDisplay
              ? "0 20px 60px rgba(0,0,0,0.72), 0 0 0 1px rgba(255,255,255,0.05), 0 0 20px rgba(224,106,44,0.14)"
              : "0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03), 0 0 16px rgba(224,106,44,0.10)")
            : (isLargeDisplay
              ? "0 20px 60px rgba(0,0,0,0.72), 0 0 0 1px rgba(255,255,255,0.05)"
              : "0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03)"),
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "width 0.3s cubic-bezier(0.32, 0.72, 0.36, 1), box-shadow 0.3s ease-in-out, border-left 0.3s ease-in-out",
        }}
      >
        {/* Severity bar */}
        <div style={{ height: 4, background: severityColor, opacity: 0.85, flexShrink: 0 }} />

        {/* Header with Beacon */}
         <div style={{
          padding: isLargeDisplay ? "14px 18px 12px" : "12px 16px 10px",
          borderBottom: "1px solid #0a0a0a",
          flexShrink: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderTopLeftRadius: 9,
          borderTopRightRadius: 9,
          background: isImmediate ? "rgba(225,75,59,0.03)" : isSevere ? "rgba(224,106,44,0.02)" : "transparent",
          transition: "background 0.3s ease-in-out",
          position: "relative",
        }}>
          <div>
            <p style={{ fontSize: isLargeDisplay ? fs(13) : fs(12), fontWeight: 600, color: isImmediate ? "#E14B3B" : isSevere ? "#E06A2C" : "#e0e0e0", letterSpacing: "0.02em", marginBottom: 3, transition: "color 0.3s ease-in-out" }}>Manarah</p>
            <p style={{ fontSize: isLargeDisplay ? fs(10) : fs(9), color: "#666", fontWeight: 400, letterSpacing: "0.01em", opacity: 0.85 }}>Advisory Watchtower</p>
          </div>
          {beacon}
         </div>

        {/* Scrollable body */}
         <div style={{ overflowY: "auto", padding: panelPadding, flex: 1 }}>

           {/* SECTION 1 — LIVE STATUS */}
           <div className="manarah-section-metrics">
           <Label fs={fs}>Live Status</Label>
           <Row label="Time to constraint" value={fmt(timeToNearest)} valueColor={ttlColor} emergency={isEmergency} fs={fs} />
           <Row label="Rate-of-rise" value={fmtRoR(slope)} valueColor={isEmergency ? severityColor : undefined} emergency={isEmergency} fs={fs} />
           <TrajectoryBar slope={slope} fs={fs} isLargeDisplay={isLargeDisplay} stateKey={stateKey} />
           </div>

           {/* Subtle divider */}
           <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: sectionMargin }} />


          {/* SECTION 3 — DOMINANT DRIVER — shown immediately in emergency */}
          <Label fs={fs}>Dominant Driver</Label>
          <p style={{
            fontSize: isEmergency ? fs(12) : fs(11),
            color: isEmergency ? severityColor : "#999",
            fontWeight: isEmergency ? 600 : 400,
            lineHeight: 1.5,
          }}>{dominantDriver}</p>

          {!isEmergency && (
            <>
              {/* Subtle divider */}
              <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: sectionMargin }} />

              {/* SECTION 2 — ESCALATION FORECAST (normal/early only) */}
              <Label fs={fs}>Escalation Forecast</Label>
              <Row label="Severe threshold in" value={ttlToSevere > 0 ? fmt(ttlToSevere) : "Reached"} valueColor={ttlToSevere <= 5 ? "#E06A2C" : "#aaa"} fs={fs} />
              <Row label="Immediate Risk in" value={ttlToImmediate > 0 ? fmt(ttlToImmediate) : "Reached"} valueColor={ttlToImmediate <= 5 ? "#E14B3B" : "#aaa"} fs={fs} />
              <p style={{ fontSize: fs(9), color: "#333", marginTop: 4, opacity: 0.82, fontWeight: 400 }}>Assumes no intervention and constant rate-of-rise.</p>

              {/* Subtle divider */}
              <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: sectionMargin }} />

              {/* SECTION 2B — OPERATOR ADVANTAGE */}
              <Label fs={fs}>Operator Advantage</Label>
              <p style={{ fontSize: fs(11), color: "#999", lineHeight: 1.4 }}>
                {getOperatorAdvantage(timeToNearest, slope, coolingCapacity, equipment, feedReductionActive, coolingBoostActive)}
              </p>
            </>
            )}

            {/* Subtle divider */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "22px 0" }} />

            {/* SECTION 4 — ACTION PRIORITY */}
            <div className="manarah-section-actions">
            <Label fs={fs}>Action Priority</Label>
            {rankedActions.map((a, i) => (
            <ImpactBar
              key={a.key}
              label={`${i + 1}. ${a.label}`}
              barFill={a.barFill}
              strengthLabel={a.strengthLabel}
              active={a.active}
              available={a.available}
              pct={a.pct}
              fs={fs}
              isLargeDisplay={isLargeDisplay}
            />
          ))}

          </div>

          {/* SECTION 5 — EVALUATE ADJUSTMENT (hidden in emergency) */}
          {!isEmergency && (
            <>
              {/* Subtle divider */}
              <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: sectionMargin }} />
              <Label fs={fs}>Evaluate Adjustment</Label>
              <select
                value={evalScenario}
                onChange={e => setEvalScenario(e.target.value)}
                style={{
                  width: "100%",
                  background: "#141414",
                  border: "1px solid #2a2a2a",
                  color: "#aaa",
                  fontSize: fs(11),
                  borderRadius: 5,
                  padding: "5px 8px",
                  outline: "none",
                  marginBottom: 8,
                }}
              >
                <option value="">— select scenario —</option>
                {EVAL_SCENARIOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              {evalResult && (
                <div style={{ background: "#0a0a0a", border: "1px solid #1e1e1e", borderRadius: 6, padding: "8px 10px" }}>
                  <Row label="Projected TTL if applied" value={fmt(evalResult.projected)} valueColor="#3FC9B0" fs={fs} />
                  <p style={{ fontSize: fs(10), color: "#444", marginTop: 2 }}>
                    {evalResult.gain > 0
                      ? `+${Math.round(evalResult.gain)} min additional margin vs. current trajectory.`
                      : "No significant margin improvement at current operating point."}
                  </p>
                  <p style={{ fontSize: fs(9), color: "#2e2e2e", marginTop: 4 }}>Projection only — no action applied.</p>
                </div>
              )}
            </>
            )}

            </div>
            {/* end scrollable body */}

            {/* Footer */}
        <div style={{ padding: isLargeDisplay ? "10px 18px" : "8px 16px", borderTop: "1px solid #181818", flexShrink: 0 }}>
          <p style={{ fontSize: fs(9), color: "#2e2e2e" }}>Advisory only — no control actions initiated by this system.</p>
        </div>
      </div>
    </>
  );
}