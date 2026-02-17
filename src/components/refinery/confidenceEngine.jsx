// Confidence and Corrective Levers Logic

export function computeConfidence(sensorQuality, opMode, valveReliability = "normal", transmitterConsistency = true) {
  let confidence = 3; // Start at High (3)
  
  // Sensor quality impact
  if (sensorQuality === "suspect") confidence -= 1;
  if (sensorQuality === "bad") confidence -= 2;
  
  // Operating mode impact
  if (opMode === "transient") confidence -= 1;
  
  // Valve reliability impact
  if (valveReliability === "oscillating" || valveReliability === "unresponsive") {
    confidence -= 1;
  }
  
  // Transmitter consistency impact
  if (!transmitterConsistency) confidence -= 1;
  
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

export function getConfidenceQualifier(sensorQuality, opMode, transmitterConsistency) {
  if (!transmitterConsistency) return "Instrument Mismatch";
  if (sensorQuality === "bad") return "Instrument Quality Poor";
  if (sensorQuality === "suspect") return "Instrument Quality Suspect";
  if (opMode === "transient") return "Transient Mode";
  return null;
}

export function getSituationHeadline(escalationLevel, timeToNearest, nearestName, coolingCapacity, preheatStatus, slope) {
  const timeStr = timeToNearest === Infinity || timeToNearest == null 
    ? "No Immediate Constraint Pressure" 
    : `${Math.round(timeToNearest)} Minutes to ${nearestName}`;
  
  // Level 3
  if (escalationLevel === 3) {
    return `Immediate Risk — ${timeStr}`;
  }
  
  // Level 2
  if (escalationLevel === 2) {
    if (coolingCapacity === "CONSTRAINED") {
      return `Cooling Authority Constrained — ${timeStr}`;
    }
    if (preheatStatus?.includes("stress")) {
      return `Catalyst Stress Risk — ${timeStr}`;
    }
    return `Escalation Prepared — ${timeStr}`;
  }
  
  // Level 1
  if (escalationLevel === 1) {
    if (coolingCapacity === "REDUCED") {
      return `Cooling Authority Reduced — ${timeStr}`;
    }
    if (slope > 1.5) {
      return `Ramp-Rate Sensitivity Active — ${timeStr}`;
    }
    return `Early Drift Detected — ${timeStr}`;
  }
  
  // Level 0
  return "System Stable — No Immediate Constraint Pressure";
}

export function getEscalationCause(escalationLevel, coolingCapacity, preheatStatus, slope, timeToNearest) {
  // Level 3
  if (escalationLevel === 3) {
    if (coolingCapacity === "CONSTRAINED") {
      return "Cooling constrained — response window compressed";
    }
    return "Time-to-limit below escalation threshold";
  }
  
  // Level 2
  if (escalationLevel === 2) {
    if (coolingCapacity === "CONSTRAINED") {
      return "Cooling constrained — response window compressed";
    }
    if (preheatStatus?.includes("stress")) {
      return "Ramp-rate exceeds recommended envelope";
    }
    return "Time-to-limit approaching critical threshold";
  }
  
  // Level 1
  if (escalationLevel === 1) {
    if (coolingCapacity === "REDUCED") {
      return "Cooling authority limited — control flexibility reduced";
    }
    if (slope > 1.5) {
      return "Ramp-rate exceeds recommended envelope";
    }
    return "Rate-of-rise increasing";
  }
  
  // Level 0
  return null;
}