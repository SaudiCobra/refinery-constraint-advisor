import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircleIcon, TriangleAlertIcon } from "./DashboardIcons";

export default function CoolingCapacityIndicator({ capacity }) {
  const config = {
    NORMAL: { 
      color: "#2F5D80", 
      label: "NORMAL",
      advisory: null,
    },
    REDUCED: { 
      color: "#B47A1F", 
      label: "REDUCED",
      advisory: "Cooling authority limited — response window compressed",
    },
    SEVERELY_LIMITED: { 
      color: "#A13A1F", 
      label: "SEVERELY LIMITED",
      advisory: "Heat removal severely limited — escalation sensitivity increased",
    },
  };

  const current = config[capacity] || config.NORMAL;

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-3 bg-[#1e1e1e] border border-[#333] rounded-lg px-5 py-3">
      <div className="flex items-center gap-3">
         <span className="text-[#666] text-xs uppercase tracking-wider">Cooling Capacity:</span>
         <div className="flex items-center gap-2">
           {capacity === "NORMAL" ? (
             <CheckCircleIcon className="w-4 h-4" style={{ color: current.color }} />
           ) : (
             <TriangleAlertIcon className="w-4 h-4" style={{ color: current.color }} />
           )}
           <span className="text-sm font-semibold" style={{ color: current.color }}>
             {current.label}
           </span>
         </div>
       </div>
      {current.advisory && (
        <>
          <div className="w-px h-6 bg-[#444] hidden md:block" />
          <span className="text-xs italic text-[#999]">{current.advisory}</span>
        </>
      )}
    </div>
  );
}