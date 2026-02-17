// Reactor Bed Imbalance and Hot Spot Risk Logic

// Simulate bed temperatures based on reactor conditions
export function simulateBedTemperatures(currentTemp, slope, equipment, escalationLevel) {
  const baseTemp = currentTemp;
  
  // Simulate 3-bed reactor with slight temperature variations
  // Variation increases with escalation level and when equipment is constrained
  const variationFactor = equipment.h2Compressor && equipment.effluentCooler ? 1.0 : 1.8;
  const slopeInfluence = Math.abs(slope) * 0.3;
  const escalationInfluence = escalationLevel * 1.5;
  
  const totalVariation = (variationFactor + slopeInfluence + escalationInfluence);
  
  // Bed 1 (top): slightly cooler typically
  const bed1 = baseTemp - (totalVariation * 0.3) + (Math.random() * 2 - 1);
  
  // Bed 2 (middle): tends to run hotter
  const bed2 = baseTemp + (totalVariation * 0.5) + (Math.random() * 2 - 1);
  
  // Bed 3 (bottom): variable based on flow distribution
  const bed3 = baseTemp + (totalVariation * 0.2) + (Math.random() * 2 - 1);
  
  return [
    { id: 1, temp: bed1, slope: slope * 0.85 },
    { id: 2, temp: bed2, slope: slope * 1.15 },
    { id: 3, temp: bed3, slope: slope * 0.95 },
  ];
}

export function computeBedImbalance(beds) {
  const temps = beds.map(b => b.temp);
  const slopes = beds.map(b => b.slope);
  
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const bedDelta = maxTemp - minTemp;
  
  // Find max slope differential
  const maxSlope = Math.max(...slopes);
  const minSlope = Math.min(...slopes);
  const slopeDiff = maxSlope - minSlope;
  
  // Identify dominant bed (hottest)
  const dominantBedIndex = temps.indexOf(maxTemp);
  const dominantBed = beds[dominantBedIndex];
  
  // Thresholds
  const IMBALANCE_THRESHOLD = 8;
  const SEVERE_THRESHOLD = 15;
  const SLOPE_DIFF_THRESHOLD = 0.6;
  
  let severity = "NONE";
  
  if (bedDelta > SEVERE_THRESHOLD || slopeDiff > SLOPE_DIFF_THRESHOLD) {
    severity = "SEVERE";
  } else if (bedDelta > IMBALANCE_THRESHOLD) {
    severity = "MILD";
  }
  
  return {
    severity,
    bedDelta: bedDelta.toFixed(1),
    dominantBed: dominantBed.id,
    dominantTemp: dominantBed.temp,
    beds,
  };
}

export function computeHotSpotRisk(bedImbalance, equipment, coolingCapacity, slope) {
  const { severity } = bedImbalance;
  
  const h2Limited = !equipment.h2Compressor;
  const coolingConstrained = coolingCapacity === "CONSTRAINED";
  const coolingReduced = coolingCapacity === "REDUCED";
  const slopeRising = slope > 1.0;
  
  // HIGH risk conditions
  if (severity === "SEVERE" && (h2Limited || coolingConstrained)) {
    return "HIGH";
  }
  
  // MEDIUM risk conditions
  if (severity === "MILD" && (h2Limited || coolingReduced) && slopeRising) {
    return "MEDIUM";
  }
  
  if (severity === "SEVERE" && !h2Limited && !coolingConstrained) {
    return "MEDIUM";
  }
  
  return "LOW";
}

export function getHotSpotRecommendation(risk) {
  if (risk === "HIGH") {
    return "Increase moderation using available levers; verify bed signals";
  }
  if (risk === "MEDIUM") {
    return "Monitor bed signals and moderation capability";
  }
  return null;
}

export function adjustEscalationForHotSpot(baseLevel, hotSpotRisk, timeToNearest) {
  if (hotSpotRisk === "HIGH" && timeToNearest < 15) {
    return Math.min(baseLevel + 1, 3);
  }
  return baseLevel;
}