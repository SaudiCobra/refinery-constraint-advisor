// Confidence and Corrective Levers Logic

export function computeConfidence(sensorQuality, opMode, valveReliability = "normal", transmitterMismatchCount = 0, totalTransmitters = 3) {
  let confidence = 3; // Start at High (3)
  
  // Sensor quality impact
  if (sensorQuality === "suspect") confidence -= 1;
  if (sensorQuality === "bad") confidence -= 2;
  
  // Operating mode impact
  if (opMode === "transient") confidence -= 1;
  
  // Valve reliability impact
  if (valveReliability === "oscillating" || valveReliability === "unresponsive" || valveReliability === "lag") {
    confidence -= 1;
  }
  
  // Multi-transmitter consistency impact
  if (transmitterMismatchCount === 1) confidence -= 1; // 1 deviates = MODERATE
  if (transmitterMismatchCount >= 2) confidence -= 2; // >1 deviates = REDUCED
  
  // Clamp between 1-3
  confidence = Math.max(1, Math.min(3, confidence));
  
  const levels = {
    3: "High",
    2: "Moderate",
    1: "Reduced",
  };
  
  return {
    level: levels[confidence],
    numeric: confidence,
    mismatchCount: transmitterMismatchCount,
    totalTransmitters: totalTransmitters,
  };
}

export function computeCorrectiveLevers(equipment) {
  let levers = 0;
  
  // Preheat exchanger bypass available
  if (equipment.preheatExchanger) levers += 1;
  
  // Effluent cooler available
  if (equipment.effluentCooler) levers += 1;
  
  // Bypass valve available (post-cooler)
  if (equipment.bypassValve) levers += 1;
  
  // Hydrogen margin available
  if (equipment.h2Compressor) levers += 1;
  
  return levers;
}

export function getConfidenceQualifiers(sensorQuality, opMode, transmitterMismatchCount, totalTransmitters, valveReliability) {
  const qualifiers = [];
  
  // Priority order - only show dominant issues
  if (transmitterMismatchCount >= 2) {
    qualifiers.push(`Data Consistency: ${transmitterMismatchCount}/${totalTransmitters} Conflict`);
  } else if (transmitterMismatchCount === 1) {
    qualifiers.push(`Data Consistency: ${transmitterMismatchCount}/${totalTransmitters} Mismatch`);
  }
  
  if (valveReliability !== "normal") {
    qualifiers.push("Control Valve: Response Unstable");
  }
  
  if (sensorQuality === "bad") {
    qualifiers.push("Instrument Quality Poor");
  } else if (sensorQuality === "suspect") {
    qualifiers.push("Instrument Quality Suspect");
  }
  
  if (opMode === "transient" && qualifiers.length === 0) {
    qualifiers.push("Transient Mode");
  }
  
  return qualifiers.slice(0, 1); // Only return first/most critical
}

export function getSituationHeadline(escalationLevel, timeToNearest, nearestName, coolingCapacity, preheatStatus, slope) {
  const timeStr = timeToNearest === Infinity || timeToNearest == null 
    ? "No Immediate Constraint Pressure" 
    : `${Math.round(timeToNearest)} Minutes to ${nearestName}`;
  
  // Level 3 - Always immediate risk
  if (escalationLevel === 3) {
    return `Immediate Risk — ${timeStr}`;
  }
  
  // Level 2 - Prioritize constraint causes
  if (escalationLevel === 2) {
    if (coolingCapacity === "CONSTRAINED") {
      return `Cooling Constrained — ${timeStr}`;
    }
    if (preheatStatus?.includes("stress")) {
      return `Catalyst Stress Risk — ${timeStr}`;
    }
    return `Escalation Prepared — ${timeStr}`;
  }
  
  // Level 1 - Prioritize early warnings
  if (escalationLevel === 1) {
    if (coolingCapacity === "REDUCED") {
      return `Cooling Authority Reduced — ${timeStr}`;
    }
    if (slope > 1.5) {
      return `Ramp-Rate Sensitivity — ${timeStr}`;
    }
    return `Early Drift Detected — ${timeStr}`;
  }
  
  // Level 0
  return "System Stable — No Immediate Constraint Pressure";
}

export function getRecommendationWithConfidence(escalationLevel, confidence, equipment, coolingCapacity, hotSpotRisk) {
  // Hot spot risk overrides
  if (hotSpotRisk === "HIGH") {
    return "Increase moderation using available levers; verify bed signals";
  }
  
  if (hotSpotRisk === "MEDIUM") {
    return "Monitor bed signals and moderation capability";
  }
  
  // Confidence overrides
  if (confidence.level === "Reduced") {
    return "Confirm instrumentation before corrective action";
  }
  
  if (confidence.level === "Moderate" && escalationLevel >= 2) {
    return "Verify signal stability before escalation";
  }
  
  // Standard recommendations
  if (escalationLevel === 0) {
    return "Monitor closely while response window remains open";
  }
  
  if (escalationLevel === 1) {
    if (coolingCapacity === "REDUCED") {
      return "Prepare escalation — cooling capacity constrained";
    }
    return "Prepare escalation if trend persists";
  }
  
  if (escalationLevel === 2) {
    if (coolingCapacity === "CONSTRAINED") {
      return "Maximize available cooling paths immediately";
    }
    return "Escalate to shift lead if margin continues shrinking";
  }
  
  return "Immediate escalation required — Notify shift lead now";
}

export function getEscalationCause(escalationLevel, coolingCapacity, preheatStatus, slope, timeToNearest, equipment, hotSpotRisk, bedImbalance) {
  // Priority order: Show only ONE dominant cause
  
  // 1) Hot Spot Risk (highest priority when present)
  if (hotSpotRisk === "HIGH") {
    return "Hot spot risk increasing";
  }
  
  // 2) Cooling Constrained
  if (coolingCapacity === "CONSTRAINED") {
    return "Cooling constrained — response window compressed";
  }
  
  // 3) Bed Temperature Imbalance (when MEDIUM hot spot or SEVERE imbalance)
  if (hotSpotRisk === "MEDIUM" || bedImbalance?.severity === "SEVERE") {
    return "Bed temperature imbalance increasing";
  }
  
  // 4) Time-to-Constraint <10 min
  if (timeToNearest < 10 && timeToNearest > 0) {
    return "Time-to-constraint below critical threshold";
  }
  
  // 5) Ramp-Rate Exceeded
  if (slope > 1.5 || preheatStatus?.includes("stress")) {
    return "Ramp-rate exceeds recommended envelope";
  }
  
  // 6) Hydrogen Margin Limited
  if (!equipment.h2Compressor && escalationLevel >= 1) {
    return "Hydrogen margin limited";
  }
  
  // 7) Cooling Reduced (lower priority)
  if (coolingCapacity === "REDUCED" && escalationLevel >= 1) {
    return "Cooling authority limited";
  }
  
  // 8) Generic drift
  if (escalationLevel >= 1) {
    return "Early upward drift detected";
  }
  
  // Level 0 - no cause
  return null;
}