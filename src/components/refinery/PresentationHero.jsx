import React from "react";
import { cn } from "@/lib/utils";
import DecisionWindowBar from "./DecisionWindowBar";
import {
  computeConfidence,
  computeCorrectiveLevers,
  getConfidenceQualifier,
  getSituationHeadline,
  getEscalationCause,
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
  
  // Compute confidence
  const transmitterConsistency = Math.random() > 0.15; // 85% chance of consistency (simulated)
  const confidence = computeConfidence(sensorQuality, opMode, "normal", transmitterConsistency);
  const confidenceQualifier = getConfidenceQualifier(sensorQuality, opMode, transmitterConsistency);
  
  // Compute corrective levers
  const correctiveLevers = computeCorrectiveLevers(equipment);
  
  // Get dynamic headline and cause
  const headline = getSituationHeadline(escalationLevel, timeToNearest, nearestName, coolingCapacity, preheatStatus, slope);
  const cause = getEscalationCause(escalationLevel, coolingCapacity, preheatStatus, slope, timeToNearest);

  const recommendation = escalationLevel === 0
    ? "Monitor closely while response window remains open."
    : escalationLevel === 1
    ? "Prepare escalation if trend persists."
    : escalationLevel === 2
    ? confidence.level === "Reduced" 
      ? "Verify instrumentation before aggressive corrective action."
      : "Escalate to shift lead if margin continues shrinking."
    : "Immediate escalation required. Notify shift lead now.";

  return (
    <div className="flex flex-col items-center justify-center px-6 space-y-6">
      {/* Enhanced Situation Headline */}
      <div className="w-full max-w-4xl">
        <div className={cn("px-6 py-4 rounded-lg border-2 text-center transition-all duration-500", `border-[${config.text.replace('text-', '')}]`)}>
          <p className={cn("text-xl font-semibold", config.text)}>
            {headline}
          </p>
          {cause && (
            <p className="text-[#999] text-sm mt-2 italic">
              Cause: {cause}
            </p>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className={cn("px-5 py-2 rounded border text-sm font-semibold tracking-widest uppercase", config.badge)}>
        {config.label}
      </div>

      {/* Decision Window Bar */}
      <div className="w-full max-w-2xl">
        <DecisionWindowBar timeToNearest={timeToNearest} />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-3xl">
        {/* Nearest Constraint */}
        <div className="bg-[#1e1e1e] border border-[#333] rounded-lg px-4 py-3 text-center">
          <p className="text-[#666] text-xs uppercase tracking-wider mb-1">Nearest Constraint</p>
          <p className="text-[#aaa] text-base font-semibold">{stable ? "—" : nearestName}</p>
        </div>

        {/* Corrective Levers */}
        <div className="bg-[#1e1e1e] border border-[#333] rounded-lg px-4 py-3 text-center">
          <p className="text-[#666] text-xs uppercase tracking-wider mb-1">Corrective Levers</p>
          <p className={cn(
            "text-base font-semibold",
            correctiveLevers === 0 && "text-[#A13A1F]",
            correctiveLevers <= 1 && correctiveLevers > 0 && "text-[#B47A1F]",
            correctiveLevers > 1 && "text-[#0F9F9F]"
          )}>
            {correctiveLevers}
          </p>
        </div>

        {/* Confidence */}
        <div className="bg-[#1e1e1e] border border-[#333] rounded-lg px-4 py-3 text-center">
          <p className="text-[#666] text-xs uppercase tracking-wider mb-1">Confidence</p>
          <p className={cn(
            "text-base font-semibold",
            confidence.level === "High" && "text-[#0F9F9F]",
            confidence.level === "Moderate" && "text-[#B47A1F]",
            confidence.level === "Reduced" && "text-[#A13A1F]"
          )}>
            {confidence.level}
          </p>
        </div>
      </div>

      {/* Confidence Qualifier */}
      {(confidence.level !== "High" || !transmitterConsistency) && (
        <div className="bg-[#2a1a1a] border border-[#B47A1F] rounded-lg px-4 py-2 text-center max-w-2xl">
          <p className="text-[#D4A547] text-xs">
            {!transmitterConsistency ? "Data Consistency: Mismatch Detected" : confidenceQualifier}
          </p>
        </div>
      )}

      {/* Status Lines */}
      <div className="flex flex-wrap justify-center gap-4 text-sm">
        {preheatActive && preheatStatus && (
          <div>
            <span className="text-[#666]">Preheat: </span>
            <span className={cn(
              "font-medium",
              preheatStatus.includes("stress") && "text-[#A13A1F]",
              preheatStatus.includes("Warning") && "text-[#B47A1F]",
              !preheatStatus.includes("stress") && !preheatStatus.includes("Warning") && "text-[#0F9F9F]"
            )}>
              {preheatStatus}
            </span>
          </div>
        )}
        
        <div>
          <span className="text-[#666]">Cooling: </span>
          <span className={cn(
            "font-medium",
            coolingCapacity === "NORMAL" && "text-[#2F5D80]",
            coolingCapacity === "REDUCED" && "text-[#B47A1F]",
            coolingCapacity === "CONSTRAINED" && "text-[#A13A1F]"
          )}>
            {coolingCapacity}
          </span>
        </div>
      </div>

      {/* Recommendation */}
      <div className="bg-[#1e1e1e] border border-[#333] rounded-lg px-6 py-4 text-center max-w-3xl">
        <p className="text-[#aaa] text-sm italic">{recommendation}</p>
      </div>

      {/* Footer Disclaimers */}
      <div className="text-center text-[#555] text-xs space-y-1 pt-2">
        <p>Advisory-only system — Not for automatic control</p>
        <p>Operator judgment remains primary authority</p>
      </div>
    </div>
  );
}