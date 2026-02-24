import React from "react";

/**
 * Derives H₂ Availability state from equipment status
 * 
 * Logic:
 * - Full: H₂ compressor online, all quench systems operational
 * - Limited: H₂ compressor online but reduced quench authority
 * - Restricted: H₂ present but ineffective for temperature control
 * - Unavailable: H₂ compressor offline or isolated
 */
const deriveH2Availability = (equipment, coolingCapacity, slope) => {
  const { h2Compressor } = equipment;
  
  // Primary check: H₂ compressor availability
  if (!h2Compressor) {
    return "Unavailable";
  }
  
  // If cooling is constrained and slope is aggressive, hydrogen is restricted
  if (coolingCapacity === "CONSTRAINED" && slope > 1.5) {
    return "Restricted";
  }
  
  // If cooling is reduced or constrained, hydrogen authority is limited
  if (coolingCapacity === "REDUCED" || coolingCapacity === "CONSTRAINED") {
    return "Limited";
  }
  
  // Moderate slope with normal cooling = Limited (conservative)
  if (slope > 1.0 && coolingCapacity === "NORMAL") {
    return "Limited";
  }
  
  // Normal operations: Full availability
  return "Full";
};

const getStateColor = (state) => {
  switch (state) {
    case "Full":
      return "text-[#0F5F5F]";
    case "Limited":
      return "text-[#B47A1F]";
    case "Restricted":
      return "text-[#D4653F]";
    case "Unavailable":
      return "text-[#A13A1F]";
    default:
      return "text-[#888]";
  }
};

export default function H2AvailabilityIndicator({ equipment, coolingCapacity, slope }) {
  const h2State = deriveH2Availability(equipment, coolingCapacity, slope);
  const stateColor = getStateColor(h2State);
  
  const getMessage = () => {
    if (h2State === "Unavailable") return "Hydrogen moderation unavailable — system offline";
    if (h2State === "Restricted") return "Hydrogen moderation restricted — limited authority";
    if (h2State === "Limited") return "Hydrogen moderation limited — reduced capacity";
    return "Hydrogen moderation available — no supply constraint";
  };
  
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2">
      <p className={`text-xs leading-relaxed transition-colors duration-500 ${stateColor}`}>
        {getMessage()}
      </p>
    </div>
  );
}