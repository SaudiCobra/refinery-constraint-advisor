import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircleIcon, TriangleAlertIcon } from "./DashboardIcons";
import { useTheme } from "@/components/refinery/ThemeContext";

export default function CoolingCapacityIndicator({ capacity }) {
  const { theme } = useTheme();
  const isLight = theme === "light";
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
    <div className={cn("flex flex-col md:flex-row items-start md:items-center gap-3 rounded-lg px-5 py-3 border transition-colors duration-300", isLight ? "bg-[#f4f6fb] border-[#d1d8e8]" : "bg-[#1e1e1e] border-[#333]")}>
      <div className="flex items-center gap-3">
         <span className={`text-xs uppercase tracking-wider ${isLight ? "text-[#9ca3af]" : "text-[#666]"}`}>Cooling Capacity:</span>
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
          <div className={`w-px h-6 hidden md:block ${isLight ? "bg-[#d1d8e8]" : "bg-[#444]"}`} />
          <span className={`text-xs italic ${isLight ? "text-[#6b7280]" : "text-[#999]"}`}>{current.advisory}</span>
        </>
      )}
    </div>
  );
}