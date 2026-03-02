import React from "react";
import { cn } from "@/lib/utils";

// Pure DCS alarm logic — same PV, same limits, no Manarah state
function getDcsAlarmState(pv, limits) {
  const hi   = Number(limits?.hi   ?? 370);
  const hihi = Number(limits?.hihi ?? 380);
  if (pv >= hihi) return "HIHI";
  if (pv >= hi)   return "HI";
  return "NORMAL";
}

export default function AlarmsOnlyView({ currentValue, limits, units }) {
  const pv = Number(currentValue);
  const dcsState = getDcsAlarmState(pv, limits);
  const hi   = Number(limits?.hi   ?? 370);
  const hihi = Number(limits?.hihi ?? 380);

  const stateStyles = {
    NORMAL: { bg: "bg-[#111b11]", border: "border-green-800",  text: "text-green-400",  label: "NO ALARM ACTIVE" },
    HI:     { bg: "bg-[#1f1c0e]", border: "border-amber-500",  text: "text-amber-300",  label: "HI ALARM" },
    HIHI:   { bg: "bg-[#220d0d]", border: "border-red-600",    text: "text-red-400",    label: "HI-HI ALARM" },
  };
  const s = stateStyles[dcsState];

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      {/* DCS header tag */}
      <p className="text-[#555] text-xs uppercase tracking-[0.18em] mb-8 font-mono">
        DCS Alarm View — {units ?? "°C"}
      </p>

      {/* Process Variable */}
      <div className="mb-10 text-center">
        <p className="text-[#555] text-xs uppercase tracking-widest mb-2 font-mono">Process Variable (PV)</p>
        <p className={cn("font-mono font-light", dcsState === "HIHI" ? "text-red-400 text-6xl" : dcsState === "HI" ? "text-amber-300 text-6xl" : "text-[#ddd] text-6xl")}>
          {pv.toFixed(1)}
          <span className="text-2xl text-[#555] ml-2">{units}</span>
        </p>
      </div>

      {/* Alarm state badge */}
      <div className={cn("px-12 py-5 rounded border-2 text-center transition-all duration-400", s.bg, s.border)}>
        <p className={cn("text-2xl font-bold tracking-[0.12em] font-mono", s.text)}>{s.label}</p>
      </div>

      {/* Limit readouts */}
      <div className="flex gap-10 mt-10">
        <div className="text-center">
          <p className="text-[#444] text-xs uppercase tracking-wider font-mono mb-1">HI</p>
          <p className={cn("text-xl font-mono font-medium", pv >= hi ? "text-amber-300" : "text-[#666]")}>
            {hi} <span className="text-sm">{units}</span>
          </p>
        </div>
        <div className="w-px bg-[#2a2a2a]" />
        <div className="text-center">
          <p className="text-[#444] text-xs uppercase tracking-wider font-mono mb-1">HI-HI</p>
          <p className={cn("text-xl font-mono font-medium", pv >= hihi ? "text-red-400" : "text-[#666]")}>
            {hihi} <span className="text-sm">{units}</span>
          </p>
        </div>
      </div>

      <p className="text-[#333] text-xs mt-12 font-mono tracking-wide">
        DCS view — no predictive margin, no response window
      </p>
    </div>
  );
}