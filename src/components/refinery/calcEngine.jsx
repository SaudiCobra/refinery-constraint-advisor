// Calculation engine for rate-of-rise and time-to-constraint projections

export function computeRateOfRise(samples, interval) {
  const now = samples[samples.length - 1];
  const prev = samples[samples.length - 2];
  if (now == null || prev == null) return 0;
  return (now - prev) / interval;
}

export function computeTimeToConstraint(currentValue, limitValue, slope) {
  if (slope <= 0) return Infinity;
  const margin = limitValue - currentValue;
  if (margin <= 0) return 0;
  return margin / slope;
}

export function computeAllConstraints(currentValue, limits, slope) {
  const constraints = [];
  
  if (limits.hi != null && limits.hi !== "") {
    const t = computeTimeToConstraint(currentValue, Number(limits.hi), slope);
    constraints.push({ name: "High", value: Number(limits.hi), time: t, margin: Number(limits.hi) - currentValue });
  }
  if (limits.hihi != null && limits.hihi !== "") {
    const t = computeTimeToConstraint(currentValue, Number(limits.hihi), slope);
    constraints.push({ name: "High-High", value: Number(limits.hihi), time: t, margin: Number(limits.hihi) - currentValue });
  }
  if (limits.spec != null && limits.spec !== "") {
    const t = computeTimeToConstraint(currentValue, Number(limits.spec), slope);
    constraints.push({ name: "Spec", value: Number(limits.spec), time: t, margin: Number(limits.spec) - currentValue });
  }
  if (limits.trip != null && limits.trip !== "") {
    const t = computeTimeToConstraint(currentValue, Number(limits.trip), slope);
    constraints.push({ name: "Trip", value: Number(limits.trip), time: t, margin: Number(limits.trip) - currentValue });
  }
  if (limits.rampRate != null && limits.rampRate !== "") {
    // Ramp-rate constraint: time until rate exceeds limit (already exceeded or not)
    constraints.push({ name: "Ramp-rate", value: Number(limits.rampRate), time: slope > Number(limits.rampRate) ? 0 : Infinity, margin: Number(limits.rampRate) - slope });
  }

  return constraints.sort((a, b) => a.time - b.time);
}

export function getNearestConstraint(constraints) {
  const positive = constraints.filter(c => c.time >= 0 && c.time < Infinity);
  return positive.length > 0 ? positive[0] : null;
}

export function getEscalationLevel(timeMinutes, preheatActive, slope, coolingCapacity) {
  let baseLevel = 0;
  
  if (timeMinutes === Infinity || timeMinutes === null) {
    baseLevel = 0;
  } else if (timeMinutes > 30) {
    baseLevel = 0;
  } else if (timeMinutes > 15) {
    baseLevel = 1;
  } else if (timeMinutes > 10) {
    baseLevel = 2;
  } else {
    baseLevel = 3;
  }

  // Preheat stress escalation
  if (preheatActive && slope > 1.5) {
    baseLevel = Math.min(baseLevel + 1, 3);
  }

  // Cooling constraint escalation
  if (coolingCapacity === "CONSTRAINED" && timeMinutes < 15) {
    baseLevel = Math.min(baseLevel + 1, 3);
  }

  return baseLevel;
}

export function computeCoolingCapacity(equipment, slope, timeToNearest) {
  const coolerAvailable = equipment.effluentCooler;
  const h2Available = equipment.h2Compressor;

  if (coolerAvailable && h2Available) {
    return "NORMAL";
  }

  if (!coolerAvailable && slope > 0 && timeToNearest < 20) {
    return "CONSTRAINED";
  }

  if (!coolerAvailable || !h2Available) {
    return "REDUCED";
  }

  return "NORMAL";
}

export function adjustTimeToConstraint(baseTime, coolingCapacity) {
  if (coolingCapacity === "REDUCED") {
    return baseTime * 0.85;
  }
  if (coolingCapacity === "CONSTRAINED") {
    return baseTime * 0.70;
  }
  return baseTime;
}

export function getAlarmState(currentValue, limits) {
  const hihi = limits.hihi != null && limits.hihi !== "" ? Number(limits.hihi) : null;
  const hi = limits.hi != null && limits.hi !== "" ? Number(limits.hi) : null;
  
  if (hihi !== null && currentValue >= hihi) return "CRITICAL";
  if (hi !== null && currentValue >= hi) return "HIGH";
  return "NORMAL";
}

export function formatTime(minutes) {
  if (minutes === Infinity || minutes == null) return "—";
  if (minutes <= 0) return "NOW";
  if (minutes < 1) return "<1 min";
  return `~${Math.round(minutes)} min`;
}

export function getRecommendation(level, nearest, equipment) {
  const unavailable = Object.entries(equipment).filter(([, v]) => !v).map(([k]) => k);
  
  if (level === 0) return "Monitor closely while response window remains open.";
  if (level === 1) {
    if (unavailable.length > 0) return "Prepare escalation — cooling capacity constrained.";
    return "Prepare escalation if trend persists.";
  }
  if (level === 2) {
    if (unavailable.length > 0) return "Maximize available cooling. Verify instrumentation quality.";
    return "Escalate to shift lead if margin continues shrinking.";
  }
  return "Immediate escalation required. Notify shift lead now.";
}

// Preset scenarios for presentation mode
export const SCENARIOS = [
  {
    name: "1. Stable Normal Condition",
    samples: [348, 348.2, 348.1, 348.3, 348.2],
    limits: { hi: 370, hihi: 380, spec: 375, trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 100000,
    sensorQuality: "good",
    opMode: "steady",
  },
  {
    name: "2. Approaching Spec Limit",
    samples: [355, 357, 359, 361, 363],
    limits: { hi: 380, hihi: 390, spec: 375, trip: 400, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 105000,
    sensorQuality: "good",
    opMode: "transient",
  },
  {
    name: "3. Fast Rise to High-High",
    samples: [365, 367, 369, 371, 373],
    limits: { hi: 370, hihi: 380, spec: 375, trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 110000,
    sensorQuality: "good",
    opMode: "transient",
  },
  {
    name: "4. Ramp-Rate Exceeded",
    samples: [340, 343.5, 347, 350.5, 354],
    limits: { hi: 380, hihi: 390, spec: "", trip: 400, rampRate: 1.5 },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 108000,
    sensorQuality: "good",
    opMode: "transient",
  },
  {
    name: "5. Sensor Quality Suspect",
    samples: [352, 354, 361, 356, 358],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 100000,
    sensorQuality: "suspect",
    opMode: "steady",
  },
  {
    name: "6. Cooling Equipment Unavailable",
    samples: [350, 352, 354, 356, 358],
    limits: { hi: 370, hihi: 380, spec: 375, trip: 390, rampRate: "" },
    equipment: { preheatExchanger: false, effluentCooler: false, bypassValve: true, h2Compressor: true },
    feedFlow: 102000,
    sensorQuality: "good",
    opMode: "steady",
  },
  {
    name: "7. Hydrogen Compressor Margin Limited",
    samples: [340, 342, 344, 346, 348],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: false },
    feedFlow: 98000,
    sensorQuality: "good",
    opMode: "steady",
  },
  {
    name: "8. Approaching Trip Limit",
    samples: [378, 380, 382, 384, 386],
    limits: { hi: 370, hihi: 375, spec: 378, trip: 395, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 115000,
    sensorQuality: "good",
    opMode: "transient",
  },
];