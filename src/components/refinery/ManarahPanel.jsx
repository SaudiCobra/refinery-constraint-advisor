import React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(min) {
  if (!isFinite(min) || min > 999) return "> 60 min";
  if (min <= 0) return "< 1 min";
  if (min < 1) return "< 1 min";
  return `${Math.round(min)} min`;
}

function fmtRoR(ror) {
  return `${ror >= 0 ? "+" : ""}${ror.toFixed(2)} °C/min`;
}

function getDominantDriver(slope, coolingCapacity, equipment, systemState) {
  const drivers = [];
  if (slope > 1.0) drivers.push({ label: "rising RoR", weight: slope });
  if (coolingCapacity === "SEVERELY_LIMITED") drivers.push({ label: "severely limited cooling capacity", weight: 3 });
  else if (coolingCapacity === "REDUCED") drivers.push({ label: "reduced cooling margin", weight: 2 });
  if (!equipment?.h2Compressor) drivers.push({ label: "hydrogen compressor offline", weight: 2.5 });
  if (!equipment?.effluentCooler) drivers.push({ label: "effluent cooler unavailable", weight: 2 });
  if (systemState === "IMMEDIATE_RISK" || systemState === "SEVERE_DRIFT") {
    if (!drivers.some(d => d.label.includes("RoR"))) {
      drivers.push({ label: "sustained high rate-of-rise", weight: 1.5 });
    }
  }
  if (drivers.length === 0) return "No dominant risk driver identified at current operating point.";
  drivers.sort((a, b) => b.weight - a.weight);
  if (drivers.length === 1) return `Risk driven primarily by ${drivers[0].label}.`;
  return `Risk driven primarily by ${drivers[0].label} and ${drivers[1].label}.`;
}

function getRankedMitigations(slope, coolingCapacity, equipment, rampProgress, feedActive, h2Active, coolingActive) {
  const options = [];

  // Feed reduction — strongest lever (maxEffect 0.25)
  const feedPct = feedActive ? Math.round(rampProgress?.feed ?? 0) : null;
  options.push({
    key: "feed",
    label: "Feed reduction",
    baseScore: 25,
    active: feedActive,
    pct: feedPct,
    impactLabel: feedActive
      ? (feedPct >= 100 ? "Strong — fully engaged" : `Strong — building (${feedPct}%)`)
      : "Strong — not active",
    available: true,
  });

  // Cooling boost — (maxEffect 0.30 but diminished if 2nd lever)
  const coolPct = coolingActive ? Math.round(rampProgress?.cooling ?? 0) : null;
  const coolingAvail = coolingCapacity !== "SEVERELY_LIMITED" && equipment?.effluentCooler !== false;
  options.push({
    key: "cooling",
    label: "Cooling boost",
    baseScore: coolingAvail ? 22 : 8,
    active: coolingActive,
    pct: coolPct,
    impactLabel: !coolingAvail
      ? "Limited — cooling headroom constrained"
      : coolingActive
        ? (coolPct >= 100 ? "Moderate — fully engaged" : `Moderate — building (${coolPct}%)`)
        : "Moderate — not active",
    available: coolingAvail,
  });

  // H2 / Quench — (maxEffect 0.20)
  const h2Pct = h2Active ? Math.round(rampProgress?.h2 ?? 0) : null;
  const h2Avail = equipment?.h2Compressor !== false;
  options.push({
    key: "h2",
    label: "Hydrogen quench",
    baseScore: h2Avail ? 18 : 5,
    active: h2Active,
    pct: h2Pct,
    impactLabel: !h2Avail
      ? "Unavailable — H2 compressor offline"
      : h2Active
        ? (h2Pct >= 100 ? "Mild stabilization — fully engaged" : `Mild stabilization — building (${h2Pct}%)`)
        : "Mild stabilization — not active",
    available: h2Avail,
  });

  // Sort: active+full first, then active building, then available+not active, then unavailable
  options.sort((a, b) => {
    const score = (o) => {
      if (!o.available) return 0;
      if (o.active && o.pct >= 100) return o.baseScore + 50;
      if (o.active) return o.baseScore + 25;
      return o.baseScore;
    };
    return score(b) - score(a);
  });

  return options;
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="border border-[#2a2a2a] rounded-md p-3 space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-[#666] font-semibold">{title}</p>
      {children}
    </div>
  );
}

function DataLine({ label, value, valueColor }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[#777] text-xs">{label}</span>
      <span className={cn("text-xs font-mono text-right", valueColor || "text-[#ccc]")}>{value}</span>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function ManarahPanel({
  open,
  onClose,
  systemState,
  timeToNearest,
  slope,
  coolingCapacity,
  equipment,
  rampProgress,
  feedReductionActive,
  quenchBoostActive,
  coolingBoostActive,
}) {
  if (!open) return null;

  // TTL at Severe and Immediate thresholds
  const ttlToSevere    = timeToNearest > 13 ? Math.max(0, timeToNearest - 13) : 0;
  const ttlToImmediate = timeToNearest > 4  ? Math.max(0, timeToNearest - 4)  : 0;

  const stateColor = {
    NORMAL:         "#0F9F9F",
    EARLY_DRIFT:    "#D4A547",
    SEVERE_DRIFT:   "#D4653F",
    IMMEDIATE_RISK: "#EF4444",
  }[systemState] || "#aaa";

  const dominantDriver = getDominantDriver(slope, coolingCapacity, equipment, systemState);
  const rankedOptions  = getRankedMitigations(
    slope, coolingCapacity, equipment, rampProgress,
    feedReductionActive, quenchBoostActive, coolingBoostActive
  );

  const impactColor = (label) => {
    if (label.startsWith("Strong")) return "#0F9F9F";
    if (label.startsWith("Moderate")) return "#D4A547";
    if (label.startsWith("Mild")) return "#888";
    if (label.startsWith("Limited") || label.startsWith("Unavailable")) return "#555";
    return "#777";
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-80 z-50 bg-[#111] border-l border-[#2a2a2a] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
          <div>
            <p className="text-white text-sm font-semibold tracking-wide">Manarah Advisory</p>
            <p className="text-[#555] text-[10px] uppercase tracking-widest mt-0.5">
              Real-time operating limit analysis
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#555] hover:text-[#aaa] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* System state pill */}
        <div className="px-4 pt-3">
          <span
            className="inline-block text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded border"
            style={{ color: stateColor, borderColor: stateColor + "55", background: stateColor + "11" }}
          >
            {systemState?.replace(/_/g, " ") || "NORMAL"}
          </span>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

          {/* 1. Live Scan */}
          <Section title="Live Scan">
            <DataLine
              label="Time to constraint"
              value={fmt(timeToNearest)}
              valueColor={timeToNearest <= 4 ? "#EF4444" : timeToNearest <= 13 ? "#D4653F" : timeToNearest <= 35 ? "#D4A547" : "#0F9F9F"}
            />
            <DataLine label="Rate-of-rise" value={fmtRoR(slope)} />
          </Section>

          {/* 2. Escalation Projection */}
          <Section title="Escalation Projection">
            {systemState === "NORMAL" || systemState === "EARLY_DRIFT" ? (
              <>
                <DataLine
                  label="Severe Drift threshold"
                  value={ttlToSevere > 0 ? `in ${fmt(ttlToSevere)}` : "Already reached"}
                  valueColor={ttlToSevere <= 5 ? "#D4653F" : "#aaa"}
                />
                <DataLine
                  label="Immediate Risk threshold"
                  value={ttlToImmediate > 0 ? `in ${fmt(ttlToImmediate)}` : "Already reached"}
                  valueColor={ttlToImmediate <= 5 ? "#EF4444" : "#aaa"}
                />
              </>
            ) : systemState === "SEVERE_DRIFT" ? (
              <>
                <DataLine label="Severe Drift" value="Currently in band" valueColor="#D4653F" />
                <DataLine
                  label="Immediate Risk threshold"
                  value={ttlToImmediate > 0 ? `in ${fmt(ttlToImmediate)}` : "Already reached"}
                  valueColor={ttlToImmediate <= 3 ? "#EF4444" : "#D4A547"}
                />
              </>
            ) : (
              <>
                <DataLine label="Immediate Risk" value="Currently active" valueColor="#EF4444" />
                <DataLine label="Constraint breach" value={fmt(timeToNearest)} valueColor="#EF4444" />
              </>
            )}
            <p className="text-[#444] text-[10px] pt-1">Projection assumes no intervention and constant rate-of-rise.</p>
          </Section>

          {/* 3. Dominant Driver */}
          <Section title="Dominant Driver">
            <p className="text-[#bbb] text-xs leading-relaxed">{dominantDriver}</p>
          </Section>

          {/* 4. Ranked Mitigation Options */}
          <Section title="Ranked Mitigation Options">
            {rankedOptions.map((opt, i) => (
              <div key={opt.key} className="flex items-start gap-2 py-1 border-t border-[#1e1e1e] first:border-t-0">
                <span className="text-[#444] text-[10px] font-mono mt-0.5 w-4 flex-shrink-0">#{i + 1}</span>
                <div className="flex-1">
                  <p className={cn("text-xs", opt.active ? "text-[#ddd]" : opt.available ? "text-[#aaa]" : "text-[#555]")}>
                    {opt.label}
                    {opt.active && <span className="ml-1 text-[10px] text-[#555]">[active]</span>}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: impactColor(opt.impactLabel) }}>
                    {opt.impactLabel}
                  </p>
                </div>
              </div>
            ))}
          </Section>

        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#1e1e1e]">
          <p className="text-[#333] text-[10px]">Advisory only — no control actions initiated by this system.</p>
        </div>
      </div>
    </>
  );
}