import React from "react";

/**
 * Derives the single dominant system state from escalation context
 * 
 * Logic hierarchy (most severe wins):
 * - Immediate Risk: Escalation level 3 or hot spot risk HIGH
 * - Escalation Imminent: Escalation level 2 or hot spot risk MEDIUM with level 1
 * - Early Drift Detected: Escalation level 1 or positive slope trend
 * - System Stable: Normal operations
 */
const deriveSystemState = (escalationLevel, hotSpotRisk, slope, coolingCapacity) => {
  // Immediate Risk: Critical escalation or high hot spot risk
  if (escalationLevel >= 3 || hotSpotRisk === "HIGH") {
    return "Immediate Risk";
  }
  
  // Escalation Imminent: Level 2 or constrained cooling with heat rise
  if (escalationLevel >= 2 || (coolingCapacity === "CONSTRAINED" && slope > 1.5)) {
    return "Escalation Imminent";
  }
  
  // Early Drift Detected: Level 1 or any upward trend with medium hot spot risk
  if (escalationLevel >= 1 || (hotSpotRisk === "MEDIUM" && slope > 0.5) || slope > 1.0) {
    return "Early Drift Detected";
  }
  
  // System Stable: Normal operations
  return "System Stable";
};

const getStateStyles = (state) => {
  switch (state) {
    case "Immediate Risk":
      return {
        bg: "bg-[#7A0F0F]",
        border: "border-[#A13A1F]",
        text: "text-white",
        glow: "shadow-[0_0_40px_rgba(161,58,31,0.6)]",
      };
    case "Escalation Imminent":
      return {
        bg: "bg-[#A13A1F]",
        border: "border-[#D4653F]",
        text: "text-white",
        glow: "shadow-[0_0_30px_rgba(212,101,63,0.4)]",
      };
    case "Early Drift Detected":
      return {
        bg: "bg-[#B47A1F]",
        border: "border-[#D4A547]",
        text: "text-white",
        glow: "shadow-[0_0_20px_rgba(180,122,31,0.3)]",
      };
    case "System Stable":
      return {
        bg: "bg-[#0F5F5F]",
        border: "border-[#2F5D80]",
        text: "text-white",
        glow: "",
      };
    default:
      return {
        bg: "bg-[#1a1a1a]",
        border: "border-[#2a2a2a]",
        text: "text-[#888]",
        glow: "",
      };
  }
};

export default function SystemStateBanner({ escalationLevel, hotSpotRisk, slope, coolingCapacity }) {
  const systemState = deriveSystemState(escalationLevel, hotSpotRisk, slope, coolingCapacity);
  const styles = getStateStyles(systemState);
  
  return (
    <div className={`w-full border-2 ${styles.bg} ${styles.border} ${styles.glow} transition-all duration-700`}>
      <div className="max-w-[2200px] mx-auto px-20 py-6">
        <div className="flex items-center justify-center">
          <div className={`text-3xl font-bold tracking-wide ${styles.text}`}>
            {systemState.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}