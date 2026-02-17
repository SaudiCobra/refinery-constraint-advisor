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

export function getConfidenceLabel(confidence, transmitterMismatchCount, totalTransmitters, sensorQuality) {
  if (confidence.level === "High") {
    return "HIGH";
  }
  
  if (confidence.level === "Moderate") {
    return "MODERATE — Data variance detected";
  }
  
  if (confidence.level === "Reduced") {
    if (transmitterMismatchCount >= 2) {
      return "REDUCED — Instrument disagreement";
    }
    if (sensorQuality === "bad") {
      return "CRITICAL — Verify instrumentation";
    }
    return "REDUCED — Data inconsistency";
  }
  
  return "HIGH";
}

export function getSituationHeadline(escalationLevel, timeToNearest, nearestName, coolingCapacity, preheatStatus, slope, hotSpotRisk, equipment) {
  const timeMin = Math.round(timeToNearest);
  
  // Priority 1: Hot Spot Risk HIGH
  if (hotSpotRisk === "HIGH") {
    return "Immediate Risk — Bed Hot Spot Developing";
  }
  
  // Priority 2: Time-to-Constraint < 10 min
  if (timeToNearest < 10 && timeToNearest > 0) {
    return `Immediate Risk — ${timeMin} Minutes to ${nearestName}`;
  }
  
  // Priority 3: Cooling Constrained
  if (coolingCapacity === "CONSTRAINED") {
    return `Cooling Constrained — ${timeMin} Minutes to ${nearestName}`;
  }
  
  // Priority 4: Hydrogen Limited
  if (!equipment.h2Compressor && escalationLevel >= 1) {
    return "Moderation Limited — Exotherm Sensitivity Increased";
  }
  
  // Priority 5: Ramp-Rate Exceeded
  if (slope > 1.5 || preheatStatus?.includes("stress")) {
    return "Rapid Temperature Rise Detected";
  }
  
  // Priority 6: Early Drift
  if (escalationLevel >= 1 && timeToNearest < Infinity) {
    return `Early Drift Detected — ${timeMin} Minutes to ${nearestName}`;
  }
  
  // Priority 7: Stable
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
  // SINGLE DOMINANT CAUSE - Strict Priority Order
  
  // 1) Hot Spot Risk HIGH
  if (hotSpotRisk === "HIGH") {
    return `Bed ${bedImbalance?.dominantBed || 2} temperature diverging from profile`;
  }
  
  // 2) Time-to-Constraint < 10 min
  if (timeToNearest < 10 && timeToNearest > 0) {
    return "Time-to-limit below escalation threshold";
  }
  
  // 3) Cooling Constrained
  if (coolingCapacity === "CONSTRAINED") {
    return "Shell-side heat recovery reduced";
  }
  
  // 4) Hydrogen Limited
  if (!equipment.h2Compressor && escalationLevel >= 1) {
    return "Hydrogen moderation limited";
  }
  
  // 5) Ramp-Rate Exceeded
  if (slope > 1.5 || preheatStatus?.includes("stress")) {
    return "Rate-of-rise exceeding expected range";
  }
  
  // 6) Early Drift
  if (escalationLevel >= 1) {
    return "Minor upward temperature drift";
  }
  
  // Stable - no cause
  return null;
}