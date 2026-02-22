import React from "react";
import { cn } from "@/lib/utils";
import DecisionWindowBar from "./DecisionWindowBar";
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
  
  // Simulate multi-transmitter consistency (85% chance of consistency)
  const simulateMismatch = Math.random() > 0.85;
  const transmitterMismatchCount = simulateMismatch ? (Math.random() > 0.5 ? 1 : 2) : 0;
  const valveReliability = (Math.random() > 0.9 && escalationLevel >= 2) ? "lag" : "normal";
  
  // Compute confidence
  const confidence = computeConfidence(sensorQuality, opMode, valveReliability, transmitterMismatchCount, 3);
  const confidenceLabel = getConfidenceLabel(confidence, transmitterMismatchCount, 3, sensorQuality);
  
  // Compute corrective levers
  const correctiveLevers = computeCorrectiveLevers(equipment);
  
  // Get dynamic headline and cause (single dominant cause)
  const headline = getSituationHeadline(escalationLevel, timeToNearest, nearestName, coolingCapacity, preheatStatus, slope, hotSpotRisk, equipment);
  const cause = getEscalationCause(escalationLevel, coolingCapacity, preheatStatus, slope, timeToNearest, equipment, hotSpotRisk, bedImbalance);
  
  // Get recommendation adjusted for confidence and hot spot risk
  const recommendation = getRecommendationWithConfidence(escalationLevel, confidence, equipment, coolingCapacity, hotSpotRisk);

  return (
    <div className="flex flex-col items-center justify-center px-6 py-8 space-y-5">
      {/* Enhanced Situation Headline - Two-Line Structure */}
      <div className="w-full max-w-5xl">
        <div className={cn("px-8 py-6 rounded-lg border-2 text-center transition-all duration-400", `border-[${config.text.replace('text-', '')}]`)}>
          <p className={cn("text-4xl font-bold tracking-tight leading-tight", config.text)}>
            {getMainHeadline(escalationLevel, hotSpotRisk, timeToNearest, coolingCapacity, equipment, slope, preheatStatus)}
          </p>
          <p className="text-[#999] text-lg mt-3 font-medium">
            {getSubline(escalationLevel, hotSpotRisk, timeToNearest, nearestName, coolingCapacity, equipment, slope, preheatStatus, bedImbalance)}
          </p>
        </div>
      </div>

      {/* Decision Window Bar */}
      <div className="w-full max-w-3xl">
        <DecisionWindowBar 
          timeToNearest={timeToNearest}
          escalationLevel={escalationLevel}
          coolingCapacity={coolingCapacity}
          equipment={equipment}
          hotSpotRisk={hotSpotRisk}
          slope={slope}
          currentTemp={0}
        />
      </div>

      {/* Nearest Constraint Badge - Only if not stable */}
      {!stable && nearestName && (
        <div className="bg-[#1e1e1e] border-2 border-[#444] rounded-lg px-6 py-3 text-center">
          <p className="text-[#888] text-xs uppercase tracking-wider mb-1">Nearest Constraint</p>
          <p className={cn("text-2xl font-bold", config.text)}>{nearestName}</p>
        </div>
      )}

      {/* Micro-Cause Line */}
      {cause && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-6 py-3 text-center max-w-2xl">
          <p className="text-[#999] text-sm font-medium">
            Cause: {cause}
          </p>
        </div>
      )}

      {/* Corrective Levers & Confidence Row */}
      <div className="flex gap-6 justify-center">
        {/* Corrective Levers - Only highlight if <=2 */}
        {correctiveLevers <= 2 && (
          <div className="bg-[#1e1e1e] border border-[#333] rounded-lg px-6 py-3 text-center min-w-[160px]">
            <p className="text-[#888] text-xs uppercase tracking-wider mb-1 font-semibold">Corrective Levers</p>
            <p className={cn(
              "text-2xl font-bold",
              correctiveLevers === 0 && "text-[#A13A1F]",
              correctiveLevers === 1 && "text-[#B47A1F]",
              correctiveLevers === 2 && "text-[#D4A547]"
            )}>
              {correctiveLevers}
            </p>
          </div>
        )}

        {/* Confidence - Always show */}
        <div className="bg-[#1e1e1e] border border-[#333] rounded-lg px-6 py-3 text-center min-w-[200px]">
          <p className="text-[#888] text-xs uppercase tracking-wider mb-1 font-semibold">Confidence</p>
          <p className={cn(
            "text-base font-bold",
            confidenceLabel.includes("HIGH") && "text-[#0F9F9F]",
            confidenceLabel.includes("MODERATE") && "text-[#B47A1F]",
            confidenceLabel.includes("REDUCED") && "text-[#A13A1F]",
            confidenceLabel.includes("CRITICAL") && "text-[#7A0F0F]"
          )}>
            {confidenceLabel}
          </p>
        </div>
      </div>

      {/* Footer Disclaimers */}
      <div className="text-center text-[#555] text-xs space-y-1 pt-2">
        <p className="tracking-wide">Advisory system — Operator judgment remains primary authority</p>
      </div>
    </div>
  );
}