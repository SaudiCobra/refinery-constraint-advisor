import React from "react";
import { cn } from "@/lib/utils";
import DecisionWindowBar from "./DecisionWindowBar";
import {
  computeConfidence,
  computeCorrectiveLevers,
  getConfidenceQualifiers,
  getSituationHeadline,
  getEscalationCause,
  getRecommendationWithConfidence,
} from "./confidenceEngine";

const LEVEL_CONFIG = {
  0: { text: "text-[#0F9F9F]", badge: "bg-[#0F5F5F]/50 text-[#0F9F9F] border-[#0F7F7F]", label: "NORMAL" },
  1: { text: "text-[#D4A547]", badge: "bg-[#B47A1F]/50 text-[#D4A547] border-[#B47A1F]", label: "DRIFTING" },
  2: { text: "text-[#D4653F]", badge: "bg-[#A13A1F]/50 text-[#D4653F] border-[#A13A1F]", label: "ESCALATION PREPARED" },
  3: { text: "text-[#B53F3F]", badge: "bg-[#7A0F0F]/60 text-[#B53F3F] border-[#7A0F0F]", label: "IMMEDIATE RISK" },
};

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
}) {
  const stable = slope <= 0 || timeToNearest === Infinity;
  const config = LEVEL_CONFIG[escalationLevel] || LEVEL_CONFIG[0];
  
  // Simulate multi-transmitter consistency (85% chance of consistency)
  const simulateMismatch = Math.random() > 0.85;
  const transmitterMismatchCount = simulateMismatch ? (Math.random() > 0.5 ? 1 : 2) : 0;
  const valveReliability = (Math.random() > 0.9 && escalationLevel >= 2) ? "lag" : "normal";
  
  // Compute confidence
  const confidence = computeConfidence(sensorQuality, opMode, valveReliability, transmitterMismatchCount, 3);
  const confidenceQualifiers = getConfidenceQualifiers(sensorQuality, opMode, transmitterMismatchCount, 3, valveReliability);
  
  // Compute corrective levers
  const correctiveLevers = computeCorrectiveLevers(equipment);
  
  // Get dynamic headline and cause (single dominant cause)
  const headline = getSituationHeadline(escalationLevel, timeToNearest, nearestName, coolingCapacity, preheatStatus, slope);
  const cause = getEscalationCause(escalationLevel, coolingCapacity, preheatStatus, slope, timeToNearest, equipment);
  
  // Get recommendation adjusted for confidence
  const recommendation = getRecommendationWithConfidence(escalationLevel, confidence, equipment, coolingCapacity);

  return (
    <div className="flex flex-col items-center justify-center px-6 py-8 space-y-5">
      {/* Enhanced Situation Headline - TOP */}
      <div className="w-full max-w-5xl">
        <div className={cn("px-8 py-5 rounded-lg border-2 text-center transition-all duration-700", `border-[${config.text.replace('text-', '')}]`)}>
          <p className={cn("text-3xl font-bold tracking-tight", config.text)}>
            {headline}
          </p>
          {cause && (
            <p className="text-[#999] text-base mt-3 italic font-medium">
              Cause: {cause}
            </p>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className={cn("px-6 py-2.5 rounded border-2 text-base font-bold tracking-widest uppercase", config.badge)}>
        {config.label}
      </div>

      {/* Decision Window Bar */}
      <div className="w-full max-w-3xl">
        <DecisionWindowBar timeToNearest={timeToNearest} />
      </div>

      {/* Nearest Constraint Badge - Only if not stable */}
      {!stable && nearestName && (
        <div className="bg-[#1e1e1e] border-2 border-[#444] rounded-lg px-6 py-3 text-center">
          <p className="text-[#888] text-xs uppercase tracking-wider mb-1">Nearest Constraint</p>
          <p className={cn("text-2xl font-bold", config.text)}>{nearestName}</p>
        </div>
      )}

      {/* Status Lines - Only show exceptions */}
      <div className="flex flex-wrap justify-center gap-6 text-base">
        {coolingCapacity !== "NORMAL" && (
          <div className="bg-[#1e1e1e] border border-[#333] rounded-lg px-5 py-2.5">
            <span className="text-[#888] text-sm">Cooling: </span>
            <span className={cn(
              "font-bold text-base",
              coolingCapacity === "REDUCED" && "text-[#B47A1F]",
              coolingCapacity === "CONSTRAINED" && "text-[#A13A1F]"
            )}>
              {coolingCapacity}
            </span>
          </div>
        )}
        
        {preheatActive && preheatStatus && (preheatStatus.includes("stress") || preheatStatus.includes("Warning")) && (
          <div className="bg-[#1e1e1e] border border-[#333] rounded-lg px-5 py-2.5">
            <span className="text-[#888] text-sm">Preheat: </span>
            <span className={cn(
              "font-bold text-base",
              preheatStatus.includes("stress") && "text-[#A13A1F]",
              preheatStatus.includes("Warning") && "text-[#B47A1F]"
            )}>
              {preheatStatus}
            </span>
          </div>
        )}
      </div>

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

        {/* Confidence - Only if not High */}
        {confidence.level !== "High" && (
          <div className="bg-[#1e1e1e] border border-[#333] rounded-lg px-6 py-3 text-center min-w-[160px]">
            <p className="text-[#888] text-xs uppercase tracking-wider mb-1 font-semibold">Confidence</p>
            <p className={cn(
              "text-2xl font-bold uppercase",
              confidence.level === "Moderate" && "text-[#B47A1F]",
              confidence.level === "Reduced" && "text-[#A13A1F]"
            )}>
              {confidence.level}
            </p>
          </div>
        )}
      </div>

      {/* Confidence Qualifiers - Only show if present */}
      {confidenceQualifiers.length > 0 && (
        <div className="bg-[#2a1a1a] border border-[#B47A1F] rounded-lg px-5 py-2 text-center max-w-2xl">
          <p className="text-[#D4A547] text-sm font-medium">
            {confidenceQualifiers[0]}
          </p>
        </div>
      )}

      {/* Recommendation */}
      <div className="bg-[#1e1e1e] border border-[#444] rounded-lg px-8 py-4 text-center max-w-4xl">
        <p className="text-[#bbb] text-base italic font-medium">{recommendation}</p>
      </div>

      {/* Footer Disclaimers */}
      <div className="text-center text-[#555] text-xs space-y-1 pt-4">
        <p className="tracking-wide">Advisory-only system — Not for automatic control</p>
        <p className="tracking-wide">Operator judgment remains primary authority</p>
      </div>
    </div>
  );
}