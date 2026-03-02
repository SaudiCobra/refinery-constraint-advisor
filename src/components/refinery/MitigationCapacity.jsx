import React, { useState, useEffect, useRef } from "react";

// Control margin percentage targets per state
const MARGIN_TARGETS = {
  NORMAL:         95,
  EARLY_DRIFT:    77,
  SEVERE_DRIFT:   50,
  IMMEDIATE_RISK: 18,
};

const CONFIG = {
  NORMAL:         { color: "#2F5D80", label: "Wide",          message: "Full range of corrective actions available." },
  EARLY_DRIFT:    { color: "#B47A1F", label: "Tightening",    message: "Some corrective flexibility remains." },
  SEVERE_DRIFT:   { color: "#A13A1F", label: "Limited",       message: "Only high-impact interventions remain." },
  IMMEDIATE_RISK: { color: "#7A0F0F", label: "Critically Low", message: "Control margin nearly exhausted." },
};

export default function MitigationCapacity({ systemState }) {
  const state = systemState || "NORMAL";
  const cfg = CONFIG[state] || CONFIG.NORMAL;
  const target = MARGIN_TARGETS[state] ?? 95;

  // Smoothly interpolate margin value
  const [margin, setMargin] = useState(target);
  const rafRef = useRef(null);

  useEffect(() => {
    const step = () => {
      setMargin(prev => {
        const diff = target - prev;
        if (Math.abs(diff) < 0.5) return target;
        return prev + diff * 0.04; // smooth interpolation
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  return (
    <div
      className="bg-[#1e1e1e] border border-[#333] rounded-lg px-5 py-3"
      style={{ transition: "border-color 400ms ease" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[#666] text-xs uppercase tracking-wider font-semibold">
            Control Margin:
          </span>
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: cfg.color, transition: "background-color 400ms ease" }}
            />
            <span
              className="text-sm font-semibold"
              style={{ color: cfg.color, transition: "color 400ms ease" }}
            >
              {cfg.label}
            </span>
          </div>
        </div>
        <span
          className="text-xs font-mono tabular-nums"
          style={{ color: cfg.color, opacity: 0.8, transition: "color 400ms ease" }}
        >
          {Math.round(margin)}%
        </span>
      </div>
      <p className="text-xs italic text-[#888] mt-1">
        {cfg.message}
      </p>
    </div>
  );
}