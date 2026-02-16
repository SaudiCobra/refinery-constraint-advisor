import React from "react";
import { cn } from "@/lib/utils";

export default function PreheatIndicator({ preheatActive, onToggle, currentTemp, slope }) {
  const ACTIVATION_LOWER = 280;
  const ACTIVATION_UPPER = 330;
  const RECOMMENDED_RAMP = 1.0;
  const STRESS_RAMP = 1.5;

  let status = "Inactive";
  let statusColor = "#555";
  let advisory = null;

  if (preheatActive) {
    if (currentTemp < ACTIVATION_LOWER) {
      status = "Below activation window";
      statusColor = "#2F5D80";
    } else if (currentTemp >= ACTIVATION_LOWER && currentTemp <= ACTIVATION_UPPER) {
      status = "Within activation window";
      statusColor = "#0F5F5F";
      
      if (slope > STRESS_RAMP) {
        advisory = "Catalyst thermal stress risk increasing";
        statusColor = "#A13A1F";
      } else if (slope > RECOMMENDED_RAMP) {
        advisory = "Ramp above recommended heat-up rate";
        statusColor = "#B47A1F";
      }
    } else {
      status = "Exiting safe activation window";
      statusColor = "#B47A1F";
    }
  }

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-[#1e1e1e] border border-[#333] rounded-lg px-5 py-3">
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div
          onClick={() => onToggle(!preheatActive)}
          className={cn(
            "w-11 h-6 rounded-full border transition-all flex items-center px-0.5",
            preheatActive ? "bg-[#0F5F5F] border-[#0F7F7F]" : "bg-[#333] border-[#555]"
          )}
        >
          <div className={cn(
            "w-5 h-5 rounded-full bg-white transition-transform",
            preheatActive && "translate-x-5"
          )} />
        </div>
        <span className="text-[#aaa] text-sm font-medium">Preheat Mode Active</span>
      </label>

      {preheatActive && (
        <>
          <div className="w-px h-6 bg-[#444] hidden md:block" />
          <div className="flex items-center gap-3">
            <span className="text-[#666] text-xs uppercase tracking-wider">Preheat Envelope:</span>
            <span className="text-sm font-medium" style={{ color: statusColor }}>{status}</span>
          </div>
          {advisory && (
            <>
              <div className="w-px h-6 bg-[#444] hidden md:block" />
              <span className="text-xs italic" style={{ color: statusColor }}>
                {advisory}
              </span>
            </>
          )}
        </>
      )}
    </div>
  );
}