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

  const colorValue = config.text.replace("text-[", "").replace("]", "");

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12">
      {/* System State — Executive Signal Block */}
      <div className="w-full max-w-6xl">
        <div
          style={{
            background: "#0E1218",
            border: `1.5px solid rgba(255,255,255,0.18)`,
            borderLeft: `3px solid ${colorValue}`,
            borderRadius: 12,
            padding: "48px 56px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "4.4rem",
              fontWeight: 700,
              letterSpacing: "-0.5px",
              lineHeight: 1.08,
              marginBottom: "28px",
              color: colorValue,
            }}
          >
            {getMainHeadline(escalationLevel, hotSpotRisk, timeToNearest, coolingCapacity, equipment, slope, preheatStatus)}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{ color: "#ffffff", fontSize: "1.15rem", fontWeight: 600, lineHeight: 1.3, opacity: 0.92 }}>
              {stable ? "No active constraints." : `${Math.round(timeToNearest)} minutes to ${nearestName}.`}
            </p>
            <p style={{ color: "#aaa", fontSize: "1rem", fontWeight: 400, lineHeight: 1.35, opacity: 0.75 }}>
              {stable ? "All parameters within operating limits." : getSubline(escalationLevel, hotSpotRisk, timeToNearest, nearestName, coolingCapacity, equipment, slope, preheatStatus, bedImbalance)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}