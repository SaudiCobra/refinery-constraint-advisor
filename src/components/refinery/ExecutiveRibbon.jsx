import React from "react";
import { cn } from "@/lib/utils";
import { formatTime } from "./calcEngine";

export default function ExecutiveRibbon({ timeToNearest, equipment, sensorQuality }) {
  const leversAvailable = Object.values(equipment).filter(Boolean).length;
  const confidence = sensorQuality === "good" ? "High" : sensorQuality === "suspect" ? "Reduced" : "Low";
  const decisionTime = timeToNearest === Infinity || timeToNearest == null ? "—" : formatTime(timeToNearest);

  return (
    <div className="flex flex-wrap items-center gap-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-5 py-3">
      <Metric label="Decision Time Gained" value={decisionTime} />
      <div className="w-px h-6 bg-[#333]" />
      <Metric label="Corrective Levers Available" value={`${leversAvailable} / 4`} />
      <div className="w-px h-6 bg-[#333]" />
      <Metric
        label="Confidence"
        value={confidence}
        valueClass={cn(
          confidence === "High" && "text-green-400",
          confidence === "Reduced" && "text-amber-400",
          confidence === "Low" && "text-red-400"
        )}
      />
    </div>
  );
}

function Metric({ label, value, valueClass }) {
  return (
    <div>
      <p className="text-[#666] text-xs uppercase tracking-wider">{label}</p>
      <p className={cn("text-[#ddd] text-sm font-semibold", valueClass)}>{value}</p>
    </div>
  );
}