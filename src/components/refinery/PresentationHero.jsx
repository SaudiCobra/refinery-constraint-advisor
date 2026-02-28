import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  computeConfidence,
  computeCorrectiveLevers,
} from "./confidenceEngine";

const LEVEL_CONFIG = {
  0: { text: "text-[#6FD0C7]" },
  1: { text: "text-[#D6A75F]" },
  2: { text: "text-[#C8732E]" },
  3: { text: "text-[#C6452F]" },
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

// Per-scenario impact lines shown only at Severe state (escalationLevel >= 2)
// Keyed by scenario name substring for loose matching
const SEVERE_IMPACT_LINES = {
  "Predictive Drift": "Projected impact: Throughput constraint within the active intervention window.",
  "Cooling Compression": "Effluent cooler offline — heat removal authority reduced by ~40%.",
  "Four-Level Escalation": "Constraint progression through all four severity bands active.",
  "Hydrogen Moderation": "H₂ quench margin limited — exotherm response capacity reduced.",
  "False Escalation": "Signal inconsistency detected — confidence qualified.",
  "True Escalation": "All sensors aligned — trajectory confirmed across instruments.",
  "default": "Operating margin compressed — corrective window narrowing.",
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
  scenarioName,
}) {
  const execState = getExecState(escalationLevel, hotSpotRisk, timeToNearest, coolingCapacity, equipment, slope, preheatStatus);
  const copy = EXEC_COPY[execState];
  const config = LEVEL_CONFIG[escalationLevel] || LEVEL_CONFIG[0];
  const colorValue = config.text.replace("text-[", "").replace("]", "");

  const isSevere = escalationLevel >= 2;

  // Impact line: appears only at Severe, fades in
  const [impactVisible, setImpactVisible] = useState(false);
  useEffect(() => {
    if (isSevere) {
      const t = setTimeout(() => setImpactVisible(true), 40);
      return () => clearTimeout(t);
    } else {
      setImpactVisible(false);
    }
  }, [isSevere]);

  // Resolve impact line for this scenario
  const getImpactLine = () => {
    if (!scenarioName) return SEVERE_IMPACT_LINES.default;
    const key = Object.keys(SEVERE_IMPACT_LINES).find(k => scenarioName.includes(k));
    return key ? SEVERE_IMPACT_LINES[key] : SEVERE_IMPACT_LINES.default;
  };

  // Confidence: Moderate only for False Escalation, High otherwise
  const isFalseEscalation = scenarioName?.includes("False Escalation");
  const confidenceLabel = isFalseEscalation ? "MODERATE" : "HIGH";
  const confidenceColor = isFalseEscalation ? "#B47A1F" : "#6FD0C7";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 40px 0" }}>
      <div style={{ width: "100%", minWidth: "70vw", maxWidth: "85vw" }}>
        <div
          style={{
            background: "#0C1117",
            border: "1.5px solid rgba(255,255,255,0.14)",
            borderRadius: 12,
            padding: "52px 64px 48px",
            textAlign: "center",
            boxShadow: "0 12px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08)",
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
            {copy.title}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ color: "#ffffff", fontSize: "1.15rem", fontWeight: 600, lineHeight: 1.3, opacity: 0.92, margin: 0 }}>
              {copy.line1}
            </p>
            <p style={{ color: "#aaa", fontSize: "1rem", fontWeight: 400, lineHeight: 1.35, opacity: 0.75, margin: 0 }}>
              {copy.line2}
            </p>
          </div>

          {/* Impact Line — Severe only, 260ms fade-in */}
          {isSevere && (
            <div style={{
              marginTop: 32,
              opacity: impactVisible ? 1 : 0,
              transition: "opacity 260ms ease",
            }}>
              <div style={{
                display: "inline-block",
                padding: "9px 20px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 6,
              }}>
                <p style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.9rem", fontWeight: 400, margin: 0, letterSpacing: "0.01em" }}>
                  {getImpactLine()}
                </p>
              </div>
            </div>
          )}

          {/* Confidence indicator */}
          <div style={{ marginTop: 28, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>
              Confidence
            </span>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: confidenceColor }} />
            <span style={{ fontSize: "0.72rem", letterSpacing: "0.08em", fontWeight: 600, color: confidenceColor }}>
              {confidenceLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}