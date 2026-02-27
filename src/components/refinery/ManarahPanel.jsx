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
  NORMAL:         "#0F9F9F",
  EARLY_DRIFT:    "#D4A547",
  SEVERE_DRIFT:   "#D4653F",
  IMMEDIATE_RISK: "#EF4444",
};

// ── Dominant driver ───────────────────────────────────────────────────────────

function getDominantDriver(slope, coolingCapacity, equipment, systemState) {
  const drivers = [];
  if (slope > 1.0) drivers.push({ label: "rising rate-of-rise", weight: slope });
  if (coolingCapacity === "SEVERELY_LIMITED") drivers.push({ label: "severely limited cooling capacity", weight: 3 });
  else if (coolingCapacity === "REDUCED") drivers.push({ label: "reduced cooling margin", weight: 2 });
  if (!equipment?.h2Compressor) drivers.push({ label: "hydrogen compressor offline", weight: 2.5 });
  if (!equipment?.effluentCooler) drivers.push({ label: "effluent cooler unavailable", weight: 2 });
  if ((systemState === "IMMEDIATE_RISK" || systemState === "SEVERE_DRIFT") && !drivers.some(d => d.label.includes("rate"))) {
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
    <p style={{ fontSize: fs(9), letterSpacing: "0.12em", textTransform: "uppercase", color: "#4a4a4a", fontWeight: 600, marginBottom: 6 }}>
      {children}
    </p>
  );
}

function Row({ label, value, valueColor, emergency, fs }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: emergency ? 8 : 4 }}>
      <span style={{ fontSize: emergency ? fs(12) : fs(11), color: emergency ? "#888" : "#666", fontWeight: emergency ? 500 : 400 }}>{label}</span>
      <span style={{ fontSize: emergency ? fs(18) : fs(12), fontFamily: "monospace", color: valueColor || "#c0c0c0", fontWeight: emergency ? 700 : 400, letterSpacing: emergency ? "0.02em" : "normal" }}>{value}</span>
    </div>
  );
}

function TrajectoryBar({ slope, fs, isLargeDisplay }) {
  // Position: 0 = safe (green), 1 = critical (red). Map slope to 0-1 range (0-2.0 slope).
  const position = Math.min(1, Math.max(0, slope / 2.0));
  const posPercent = Math.round(position * 100);

  // Direction arrow based on slope magnitude
  let ArrowIcon = Minus;
  if (slope > 0.5) ArrowIcon = ArrowUp;
  else if (slope < -0.5) ArrowIcon = ArrowDown;

  return (
    <div style={{ marginBottom: isLargeDisplay ? 10 : 8 }}>
      <p style={{ fontSize: fs(9), letterSpacing: "0.12em", textTransform: "uppercase", color: "#4a4a4a", fontWeight: 600, marginBottom: 4 }}>
        Risk Trajectory
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {/* Gradient bar */}
        <div
          style={{
            flex: 1,
            height: 8,
            borderRadius: 3,
            background: "linear-gradient(90deg, #0F9F9F 0%, #D4A547 50%, #EF4444 100%)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Moving indicator */}
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

        {/* Direction arrow */}
        <ArrowIcon style={{ width: fs(14), height: fs(14), color: "#888", flexShrink: 0 }} />
      </div>
    </div>
  );
}

function ImpactBar({ label, barFill, strengthLabel, active, available, pct, fs, isLargeDisplay }) {
  const TOTAL_BLOCKS = 9;
  const filled = Math.round(barFill * TOTAL_BLOCKS);
  const barColor = !available ? "#2a2a2a"
    : strengthLabel === "Strong"    ? "#0F9F9F"
    : strengthLabel === "Moderate"  ? "#D4A547"
    : strengthLabel === "Mild"      ? "#6a6a6a"
    : "#2a2a2a";

  const labelColor = !available ? "#3a3a3a" : active ? "#ddd" : "#888";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isLargeDisplay ? 11 : 7 }}>
      <span style={{ fontSize: fs(11), color: labelColor, width: 120, flexShrink: 0 }}>
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
  const panelPadding = isLargeDisplay ? "14px 19px" : "13px 17px";
  const sectionMargin = isLargeDisplay ? "14px 0" : "12px 0";
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

  const ttlColor = timeToNearest <= 4 ? "#EF4444" : timeToNearest <= 13 ? "#D4653F" : timeToNearest <= 35 ? "#D4A547" : "#0F9F9F";
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
      {/* Fade-in overlay — no slide */}
      <style>{`
        @keyframes manarah-fadein { from { opacity: 0; transform: scale(0.97) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .manarah-panel { animation: manarah-fadein 0.3s ease-out forwards; }
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
          borderLeft: isSevere ? "2px solid rgba(212,101,63,0.6)" : isImmediate ? "2px solid rgba(239,68,68,0.7)" : "1px solid #222",
          borderRadius: 10,
          boxShadow: isImmediate
            ? (isLargeDisplay
              ? "0 32px 80px rgba(0,0,0,0.82), 0 0 0 1px rgba(255,255,255,0.05), 0 0 28px rgba(239,68,68,0.20)"
              : "0 18px 52px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03), 0 0 22px rgba(239,68,68,0.16)")
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

        {/* Header */}
        <div style={{
          padding: isLargeDisplay ? "14px 18px 12px" : "12px 16px 10px",
          borderBottom: "1px solid #1a1a1a",
          flexShrink: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderTopLeftRadius: 9,
          borderTopRightRadius: 9,
          background: isImmediate ? "rgba(239,68,68,0.04)" : "transparent",
          transition: "background 0.3s ease-in-out",
        }}>
          <div>
            <p style={{ fontSize: isLargeDisplay ? fs(14) : fs(13), fontWeight: 700, color: isImmediate ? "#ff6b6b" : "#e0e0e0", letterSpacing: "0.06em", marginBottom: 2, transition: "color 0.3s ease-in-out" }}>MANARAH</p>
            <p style={{ fontSize: isLargeDisplay ? fs(11) : fs(10), color: "#444", letterSpacing: "0.04em" }}>Advisory Watchtower — Operator retains full control</p>
          </div>

        </div>

        {/* Scrollable body */}
         <div style={{ overflowY: "auto", padding: panelPadding, flex: 1 }}>

           {/* SECTION 1 — LIVE STATUS */}
           <Label fs={fs}>Live Status</Label>
           <Row label="Time to constraint" value={fmt(timeToNearest)} valueColor={ttlColor} emergency={isEmergency} fs={fs} />
           <Row label="Rate-of-rise" value={fmtRoR(slope)} valueColor={isEmergency ? severityColor : undefined} emergency={isEmergency} fs={fs} />

           <TrajectoryBar slope={slope} fs={fs} isLargeDisplay={isLargeDisplay} />

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
              <Row label="Severe threshold in" value={ttlToSevere > 0 ? fmt(ttlToSevere) : "Reached"} valueColor={ttlToSevere <= 5 ? "#D4653F" : "#aaa"} fs={fs} />
              <Row label="Immediate Risk in" value={ttlToImmediate > 0 ? fmt(ttlToImmediate) : "Reached"} valueColor={ttlToImmediate <= 5 ? "#EF4444" : "#aaa"} fs={fs} />
              <p style={{ fontSize: fs(9), color: "#333", marginTop: 4 }}>Assumes no intervention and constant rate-of-rise.</p>

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
            <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: sectionMargin }} />

            {/* SECTION 4 — ACTION PRIORITY */}
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
                  <Row label="Projected TTL if applied" value={fmt(evalResult.projected)} valueColor="#0F9F9F" fs={fs} />
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

        {/* Footer */}
        <div style={{ padding: isLargeDisplay ? "10px 18px" : "8px 16px", borderTop: "1px solid #181818", flexShrink: 0 }}>
          <p style={{ fontSize: fs(9), color: "#2e2e2e" }}>Advisory only — no control actions initiated by this system.</p>
        </div>
      </div>
    </>
  );
}