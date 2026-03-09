import React from "react";
import { ShieldIcon } from "./DashboardIcons";
import { useTheme } from "@/components/refinery/ThemeContext";
import MitigationCapacity from "./MitigationCapacity";
import CoolingCapacityIndicator from "./CoolingCapacityIndicator";
import H2AvailabilityIndicator from "./H2AvailabilityIndicator";

export default function OpsCapacityPanel({ systemState, coolingCapacity, equipment, slope, isPreheatMode = false }) {
  return (
    <div className="bg-[#161616] border border-[#2e2e2e] rounded-xl px-6 py-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldIcon className="w-4 h-4 text-[#666]" />
        <p className="text-[#555] text-[10px] uppercase tracking-widest font-semibold">Operational Capacity</p>
      </div>

      {isPreheatMode ? (
        <div className="space-y-2">
          <div className="bg-[#1e1e1e] border border-[#2a1a00] rounded-lg px-5 py-3">
            <p className="text-[#666] text-xs uppercase tracking-wider font-semibold mb-1">Control Margin</p>
            <p className="text-sm font-semibold text-[#C8AA50]">Warm-Up Mode</p>
            <p className="text-xs italic text-[#888] mt-1">Mitigation levers not applicable during reactor warm-up phase.</p>
          </div>
          <div className="bg-[#1e1e1e] border border-[#333] rounded-lg px-5 py-3">
            <p className="text-[#666] text-xs uppercase tracking-wider font-semibold mb-1">Cooling Capacity</p>
            <p className="text-sm font-semibold text-[#2F5D80]">Minimal — Heat retained in loop</p>
            <p className="text-xs italic text-[#888] mt-1">E-2 effluent cooler operating at minimal duty during circulation warm-up.</p>
          </div>
          <div className="bg-[#1e1e1e] border border-[#333] rounded-lg px-5 py-3">
            <p className="text-[#666] text-xs uppercase tracking-wider font-semibold mb-1">H₂ Availability</p>
            <p className="text-sm font-semibold text-[#6FD0C7]">Available — Standby</p>
            <p className="text-xs italic text-[#888] mt-1">Hydrogen quench system on standby; not required during pre-reaction warm-up.</p>
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