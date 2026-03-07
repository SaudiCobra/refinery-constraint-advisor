import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircleIcon, ActivityIcon } from "./DashboardIcons";
import { formatTime } from "./calcEngine";

export default function ExecutiveRibbon({ timeToNearest, equipment, sensorQuality, isPreheatMode = false }) {
  if (isPreheatMode) {
    return (
      <div className="flex flex-wrap items-center gap-6 bg-[#1a1a1a] border border-[#2a1a00] rounded-t-lg rounded-b-none border-b-0 px-5 py-3">
        <Metric
          label="Prediction confidence"
          value="N/A — Preheat mode"
          icon={<ActivityIcon className="w-4 h-4" />}
          valueClass="text-[#C8AA50]"
        />
      </div>
    );
  }
  const leversAvailable = Object.values(equipment).filter(Boolean).length;
  const confidenceValue = sensorQuality === "good" ? "High" : sensorQuality === "suspect" ? "Reduced" : "Low";
  const confidenceLabel = sensorQuality === "good" ? "High — trend confirmed" : sensorQuality === "suspect" ? "Reduced — sensor quality" : "Low — data quality";
  const decisionTime = timeToNearest === Infinity || timeToNearest == null ? "—" : formatTime(timeToNearest);

  const confidenceIcon = confidenceValue === "High" ? CheckCircleIcon : ActivityIcon;
  const ConfidenceIcon = confidenceIcon;

  return (
    <div className="flex flex-wrap items-center gap-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-t-lg rounded-b-none border-b-0 px-5 py-3">
      <Metric
        label="Prediction confidence"
        value={confidenceLabel}
        icon={<ConfidenceIcon className="w-4 h-4" />}
        valueClass={cn(
          confidenceValue === "High" && "text-green-400",
          confidenceValue === "Reduced" && "text-amber-400",
          confidenceValue === "Low" && "text-red-400"
        )}
      />
    </div>
  );
}

function Metric({ label, value, icon, valueClass }) {
  return (
    <div>
      <p className="text-[#666] text-xs uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2">
        {icon && <span className="text-[#aaa]">{icon}</span>}
        <p className={cn("text-[#ddd] text-sm font-semibold", valueClass)}>{value}</p>
      </div>
    </div>
  );
}