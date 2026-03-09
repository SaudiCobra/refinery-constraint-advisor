import React from "react";
import { ShieldIcon } from "./DashboardIcons";
import { useTheme } from "@/components/refinery/ThemeContext";
import MitigationCapacity from "./MitigationCapacity";
import CoolingCapacityIndicator from "./CoolingCapacityIndicator";
import H2AvailabilityIndicator from "./H2AvailabilityIndicator";

export default function OpsCapacityPanel({ systemState, coolingCapacity, equipment, slope, isPreheatMode = false }) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className={`rounded-xl px-6 py-5 space-y-4 border transition-colors duration-300 ${isLight ? "bg-[#f4f6fb] border-[#d1d8e8]" : "bg-[#161616] border-[#2e2e2e]"}`}>
      <div className="flex items-center gap-2">
        <ShieldIcon className={`w-4 h-4 ${isLight ? "text-[#9ca3af]" : "text-[#666]"}`} />
        <p className={`text-[10px] uppercase tracking-widest font-semibold ${isLight ? "text-[#9ca3af]" : "text-[#555]"}`}>Operational Capacity</p>
      </div>

      {isPreheatMode ? (
        <div className="space-y-2">
          <div className={`border rounded-lg px-5 py-3 ${isLight ? "bg-[#fdf6e8] border-[#e8d5a0]" : "bg-[#1e1e1e] border-[#2a1a00]"}`}>
            <p className={`text-xs uppercase tracking-wider font-semibold mb-1 ${isLight ? "text-[#9ca3af]" : "text-[#666]"}`}>Control Margin</p>
            <p className="text-sm font-semibold text-[#C8AA50]">Warm-Up Mode</p>
            <p className={`text-xs italic mt-1 ${isLight ? "text-[#6b7280]" : "text-[#888]"}`}>Mitigation levers not applicable during reactor warm-up phase.</p>
          </div>
          <div className={`border rounded-lg px-5 py-3 ${isLight ? "bg-[#f4f6fb] border-[#d1d8e8]" : "bg-[#1e1e1e] border-[#333]"}`}>
            <p className={`text-xs uppercase tracking-wider font-semibold mb-1 ${isLight ? "text-[#9ca3af]" : "text-[#666]"}`}>Cooling Capacity</p>
            <p className="text-sm font-semibold text-[#2F5D80]">Minimal — Heat retained in loop</p>
            <p className={`text-xs italic mt-1 ${isLight ? "text-[#6b7280]" : "text-[#888]"}`}>E-2 effluent cooler operating at minimal duty during circulation warm-up.</p>
          </div>
          <div className={`border rounded-lg px-5 py-3 ${isLight ? "bg-[#f4f6fb] border-[#d1d8e8]" : "bg-[#1e1e1e] border-[#333]"}`}>
            <p className={`text-xs uppercase tracking-wider font-semibold mb-1 ${isLight ? "text-[#9ca3af]" : "text-[#666]"}`}>H₂ Availability</p>
            <p className="text-sm font-semibold text-[#6FD0C7]">Available — Standby</p>
            <p className={`text-xs italic mt-1 ${isLight ? "text-[#6b7280]" : "text-[#888]"}`}>Hydrogen quench system on standby; not required during pre-reaction warm-up.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <MitigationCapacity systemState={systemState} />
          <CoolingCapacityIndicator capacity={coolingCapacity} />
          <H2AvailabilityIndicator
            equipment={equipment}
            coolingCapacity={coolingCapacity}
            slope={slope}
          />
        </div>
      )}
    </div>
  );
}