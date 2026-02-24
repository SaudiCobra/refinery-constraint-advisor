import React from "react";
import { cn } from "@/lib/utils";
import DecisionWindowBar from "./DecisionWindowBar";
import LeverContext from "./LeverContext";
import {
  computeConfidence,
  computeCorrectiveLevers,
  getConfidenceLabel,
  getSituationHeadline,
  getEscalationCause,
  getRecommendationWithConfidence,
} from "./confidenceEngine";

const LEVEL_CONFIG = {
  0: { text: "text-[#0F9F9F]" },
  1: { text: "text-[#D4A547]" },
  2: { text: "text-[#D4653F]" },
  3: { text: "text-[#B53F3F]" },
};

function getMainHeadline(escalationLevel, hotSpotRisk, timeToNearest, coolingCapacity, equipment, slope, preheatStatus) {
  if (hotSpotRisk === "HIGH") return "Immediate Risk";
  if (timeToNearest < 10 && timeToNearest > 0) return "Immediate Risk";
  if (coolingCapacity === "CONSTRAINED") return "Cooling Constrained";
  if (!equipment.h2Compressor && escalationLevel >= 1) return "Moderation Limited";
  if (slope > 1.5 || preheatStatus?.includes("stress")) return "Rapid Temperature Rise";
  if (escalationLevel >= 1) return "Early Drift Detected";
  return "System Stable";
}

function getSubline(escalationLevel, hotSpotRisk, timeToNearest, nearestName, coolingCapacity, equipment, slope, preheatStatus, bedImbalance) {
  if (hotSpotRisk === "HIGH") return "Bed hot spot developing";
  if (timeToNearest < 10 && timeToNearest > 0) return `${Math.round(timeToNearest)} minutes to ${nearestName} at current trend`;
  if (coolingCapacity === "CONSTRAINED") return "Heat removal capability reduced";
  if (!equipment.h2Compressor && escalationLevel >= 1) return "Exotherm sensitivity increased";
  if (slope > 1.5 || preheatStatus?.includes("stress")) return "Rate-of-rise above expected range";
  if (escalationLevel >= 1 && timeToNearest < Infinity) return `${Math.round(timeToNearest)} minutes to ${nearestName} at current rate`;
  return "No binding constraints detected";
}

export default function PresentationHero({ 
  timeToNearest, 
  nearestName, 
  escalationLevel, 
  slope, 
  equipment,
  preheatActive,
  preheatStatus,
  coolingCapacity,
  sensorQuality,
  opMode,
  bedImbalance,
  hotSpotRisk,
}) {
  const stable = slope <= 0 || timeToNearest === Infinity;
  const config = LEVEL_CONFIG[escalationLevel] || LEVEL_CONFIG[0];
  
  // Compute corrective levers
  const correctiveLevers = computeCorrectiveLevers(equipment);
  
  // Determine confidence status (simplified for Presentation Mode)
  const confidenceStatus = (sensorQuality === "degraded" || sensorQuality === "poor") 
    ? "Under Review" 
    : "Normal";

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 space-y-8">
      {/* System State - Single Dominant Element */}
      <div className="w-full max-w-6xl">
        <div className={cn("px-12 py-10 rounded-lg border-4 text-center transition-all duration-400", `border-[${config.text.replace('text-', '')}]`)}>
          <p className={cn("text-6xl font-bold tracking-tight leading-tight mb-6", config.text)}>
            {getMainHeadline(escalationLevel, hotSpotRisk, timeToNearest, coolingCapacity, equipment, slope, preheatStatus)}
          </p>
          <div className="space-y-1">
            <p className="text-[#999] text-base">
              {stable ? "No active constraints." : `${Math.round(timeToNearest)} minutes to ${nearestName}.`}
            </p>
            <p className="text-[#999] text-base">
              {stable ? "All parameters within operating limits." : getSubline(escalationLevel, hotSpotRisk, timeToNearest, nearestName, coolingCapacity, equipment, slope, preheatStatus, bedImbalance)}
            </p>
          </div>
        </div>
      </div>

      {/* Compact Metrics */}
      <div className="w-full max-w-4xl space-y-2">
        <p className="text-[#888] text-sm">
          <span className="text-[#666]">Assessment Confidence:</span> {confidenceLabel}
        </p>
        <p className="text-[#888] text-sm">
          <span className="text-[#666]">Mitigation Capacity:</span> {stable ? "Available" : `${correctiveLevers.available} / ${correctiveLevers.total} active`}
        </p>
      </div>
    </div>
  );
}