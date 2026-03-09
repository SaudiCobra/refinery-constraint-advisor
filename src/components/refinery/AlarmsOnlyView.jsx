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

  // Detect light mode from html class
  const isLight = typeof document !== "undefined" && document.documentElement.style.background === "#f4f6f8";

  const stateStyles = {
    NORMAL: { bg: isLight ? "bg-[#e8f2e8]" : "bg-[#111b11]", border: "border-green-600",  text: isLight ? "text-green-700"  : "text-green-400",  label: "NO ALARM ACTIVE" },
    HI:     { bg: isLight ? "bg-[#fdf3dc]" : "bg-[#1f1c0e]", border: "border-amber-500",  text: isLight ? "text-amber-700"  : "text-amber-300",  label: "HI ALARM" },
    HIHI:   { bg: isLight ? "bg-[#fde8e8]" : "bg-[#220d0d]", border: "border-red-500",    text: isLight ? "text-red-700"    : "text-red-400",    label: "HI-HI ALARM" },
  };
  const s = stateStyles[dcsState];

  const mutedText   = isLight ? "text-[#5a6478]" : "text-[#555]";
  const labelText   = isLight ? "text-[#374151]" : "text-[#444]";
  const inactiveVal = isLight ? "text-[#1a2540]" : "text-[#ddd]";
  const inactiveNum = isLight ? "text-[#4b5568]" : "text-[#666]";
  const divider     = isLight ? "bg-[#c4ccde]"   : "bg-[#2a2a2a]";
  const footerText  = isLight ? "text-[#8a94a6]" : "text-[#333]";

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <p className={cn("text-xs uppercase tracking-[0.18em] mb-8 font-mono", mutedText)}>
        DCS Alarm View — {units ?? "°C"}
      </p>

      <div className="mb-10 text-center">
        <p className={cn("text-xs uppercase tracking-widest mb-2 font-mono", mutedText)}>Process Variable (PV)</p>
        <p className={cn("font-mono font-light text-6xl", dcsState === "HIHI" ? (isLight ? "text-red-700" : "text-red-400") : dcsState === "HI" ? (isLight ? "text-amber-700" : "text-amber-300") : inactiveVal)}>
          {pv.toFixed(1)}
          <span className={cn("text-2xl ml-2", mutedText)}>{units}</span>
        </p>
      </div>

      <div className={cn("px-12 py-5 rounded border-2 text-center transition-all duration-400", s.bg, s.border)}>
        <p className={cn("text-2xl font-bold tracking-[0.12em] font-mono", s.text)}>{s.label}</p>
      </div>

      <div className="flex gap-10 mt-10">
        <div className="text-center">
          <p className={cn("text-xs uppercase tracking-wider font-mono mb-1", labelText)}>HI</p>
          <p className={cn("text-xl font-mono font-medium", pv >= hi ? (isLight ? "text-amber-700" : "text-amber-300") : inactiveNum)}>
            {hi} <span className="text-sm">{units}</span>
          </p>
        </div>
        <div className={cn("w-px", divider)} />
        <div className="text-center">
          <p className={cn("text-xs uppercase tracking-wider font-mono mb-1", labelText)}>HI-HI</p>
          <p className={cn("text-xl font-mono font-medium", pv >= hihi ? (isLight ? "text-red-700" : "text-red-400") : inactiveNum)}>
            {hihi} <span className="text-sm">{units}</span>
          </p>
        </div>
      </div>

      <p className={cn("text-xs mt-12 font-mono tracking-wide", footerText)}>
        DCS view — no predictive margin, no response window
      </p>
    </div>
  );
}