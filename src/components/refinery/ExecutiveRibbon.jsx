import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircleIcon, ActivityIcon } from "./DashboardIcons";
import { formatTime } from "./calcEngine";
import { useTheme } from "@/components/refinery/ThemeContext";

export default function ExecutiveRibbon({ timeToNearest, equipment, sensorQuality, isPreheatMode = false }) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  if (isPreheatMode) {
    return (
      <div className={`flex flex-wrap items-center gap-6 rounded-t-lg rounded-b-none border-b-0 border px-5 py-3 transition-colors duration-300 ${isLight ? "bg-[#fdf6e8] border-[#e8d5a0]" : "bg-[#1a1a1a] border-[#2a1a00]"}`}>
        <Metric
          label="Prediction confidence"
          value="N/A — Preheat mode"
          icon={<ActivityIcon className="w-4 h-4" />}
          valueClass="text-[#C8AA50]"
          isLight={isLight}
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
    <div className={`flex flex-wrap items-center gap-6 rounded-t-lg rounded-b-none border-b-0 border px-5 py-3 transition-colors duration-300 ${isLight ? "bg-[#f4f6fb] border-[#d1d8e8]" : "bg-[#1a1a1a] border-[#2a2a2a]"}`}>
      <Metric
        label="Prediction confidence"
        value={confidenceLabel}
        icon={<ConfidenceIcon className="w-4 h-4" />}
        valueClass={cn(
          confidenceValue === "High" && "text-green-400",
          confidenceValue === "Reduced" && "text-amber-400",
          confidenceValue === "Low" && "text-red-400"
        )}
        isLight={isLight}
      />
    </div>
  );
}

function Metric({ label, value, icon, valueClass, isLight }) {
  return (
    <div>
      <p className={`text-xs uppercase tracking-wider ${isLight ? "text-[#9ca3af]" : "text-[#666]"}`}>{label}</p>
      <div className="flex items-center gap-2">
        {icon && <span className={isLight ? "text-[#6b7280]" : "text-[#aaa]"}>{icon}</span>}
        <p className={cn(isLight ? "text-[#374151]" : "text-[#ddd]", "text-sm font-semibold", valueClass)}>{value}</p>
      </div>
    </div>
  );
}