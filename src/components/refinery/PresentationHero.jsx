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
    <div className="flex flex-col items-center justify-center px-6 py-12 space-y-8">
      {/* System State - Single Dominant Element */}
      <div className="w-full max-w-6xl">
        <div className={cn("px-12 py-10 rounded-lg border-4 text-center transition-all duration-400", `border-[${config.text.replace('text-', '')}]`)}>
          <p className={cn("text-6xl font-bold tracking-tight leading-tight mb-4", config.text)}>
            {getMainHeadline(escalationLevel, hotSpotRisk, timeToNearest, coolingCapacity, equipment, slope, preheatStatus)}
          </p>
          <p className="text-[#aaa] text-xl font-medium">
            {getSubline(escalationLevel, hotSpotRisk, timeToNearest, nearestName, coolingCapacity, equipment, slope, preheatStatus, bedImbalance)}
          </p>
        </div>
      </div>

      {/* Collapsed Secondary Information */}
      <div className="w-full max-w-4xl space-y-2 opacity-60">
        {/* Decision Window - Collapsed */}
        {!stable && (
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded px-4 py-2 flex items-center justify-between text-xs">
            <span className="text-[#666] uppercase tracking-wider">Intervention Window</span>
            <span className="text-[#888]">{Math.round(timeToNearest)} min available</span>
          </div>
        )}

        {/* Operational Flexibility - Collapsed */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded px-4 py-2 flex items-center justify-between text-xs">
          <span className="text-[#666] uppercase tracking-wider">Mitigation Capacity</span>
          <span className="text-[#888]">{correctiveLevers.available} / {correctiveLevers.total} active</span>
        </div>

        {/* Confidence - Collapsed */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded px-4 py-2 flex items-center justify-between text-xs">
          <span className="text-[#666] uppercase tracking-wider">Assessment Confidence</span>
          <span className={cn(
            "font-medium",
            confidenceLabel.includes("HIGH") && "text-[#0F9F9F]",
            confidenceLabel.includes("MODERATE") && "text-[#B47A1F]",
            confidenceLabel.includes("REDUCED") && "text-[#A13A1F]"
          )}>
            {confidenceLabel}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[#444] text-xs pt-4">
        <p>Situation understood and under operator control</p>
      </div>
    </div>
  );
}