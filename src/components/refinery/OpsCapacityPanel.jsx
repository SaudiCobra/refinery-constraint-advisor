import React from "react";
import { ShieldIcon } from "./DashboardIcons";
import MitigationCapacity from "./MitigationCapacity";
import CoolingCapacityIndicator from "./CoolingCapacityIndicator";
import H2AvailabilityIndicator from "./H2AvailabilityIndicator";

export default function OpsCapacityPanel({ systemState, coolingCapacity, equipment, slope }) {
  return (
    <div className="bg-[#161616] border border-[#2e2e2e] rounded-xl px-6 py-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldIcon className="w-4 h-4 text-[#666]" />
        <p className="text-[#555] text-[10px] uppercase tracking-widest font-semibold">Operational Capacity</p>
      </div>

      <div className="space-y-3">
        {/* 1 — Mitigation capacity */}
        <MitigationCapacity systemState={systemState} />

        {/* 2 — Cooling capacity */}
        <CoolingCapacityIndicator capacity={coolingCapacity} />

        {/* 3 — Hydrogen availability */}
        <H2AvailabilityIndicator
          equipment={equipment}
          coolingCapacity={coolingCapacity}
          slope={slope}
        />
      </div>
    </div>
  );
}