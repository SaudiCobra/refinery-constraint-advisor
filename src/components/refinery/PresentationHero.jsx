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

function getExecState(escalationLevel, hotSpotRisk, timeToNearest, coolingCapacity, equipment, slope, preheatStatus) {
  const isImmediate = hotSpotRisk === "HIGH" || (timeToNearest < 10 && timeToNearest > 0)
    || coolingCapacity === "CONSTRAINED" || (!equipment.h2Compressor && escalationLevel >= 2);
  const isSevere = escalationLevel >= 2 || slope > 1.5 || preheatStatus?.includes("stress");
  const isEarly = escalationLevel >= 1;

  if (isImmediate) return "immediate";
  if (isSevere) return "severe";
  if (isEarly) return "early";
  return "stable";
}

const EXEC_COPY = {
  stable:    { title: "System Stable",             line1: "No active constraints.",         line2: "Operational headroom intact." },
  early:     { title: "Early Drift Detected",      line1: "Acceleration observed.",          line2: "Intervention window remains open." },
  severe:    { title: "Constraint Escalating",     line1: "Operating limit approaching.",    line2: "Intervention window narrowing." },
  immediate: { title: "Immediate Constraint Risk", line1: "Limit breach imminent.",          line2: "Corrective action required." },
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 40px 0" }}>
      {/* System State — Executive Signal Block */}
      <div style={{ width: "100%", minWidth: "70vw", maxWidth: "85vw" }}>
        <div
          style={{
            background: "#0E1218",
            border: `1.5px solid rgba(255,255,255,0.18)`,
            borderLeft: `3px solid ${colorValue}`,
            borderRadius: 12,
            padding: "52px 64px 48px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "4.4rem",
              fontWeight: 700,
              letterSpacing: "-0.5px",
              lineHeight: 1.08,
              marginBottom: "36px",
              color: colorValue,
            }}
          >
            {getMainHeadline(escalationLevel, hotSpotRisk, timeToNearest, coolingCapacity, equipment, slope, preheatStatus)}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ color: "#ffffff", fontSize: "1.15rem", fontWeight: 600, lineHeight: 1.3, opacity: 0.92, margin: 0 }}>
              {stable ? "No active constraints." : `${Math.round(timeToNearest)} minutes to ${nearestName}.`}
            </p>
            <p style={{ color: "#aaa", fontSize: "1rem", fontWeight: 400, lineHeight: 1.35, opacity: 0.75, margin: 0 }}>
              {stable ? "All parameters within operating limits." : getSubline(escalationLevel, hotSpotRisk, timeToNearest, nearestName, coolingCapacity, equipment, slope, preheatStatus, bedImbalance)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}