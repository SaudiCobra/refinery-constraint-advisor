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

  // Preheat stress escalation - force to at least Level 2
  if (preheatActive && slope > 1.5) {
    baseLevel = Math.max(baseLevel, 2);
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
  const bypassAvailable = equipment.bypassValve;

  // NORMAL: Both cooler and H2 margin available
  if (coolerAvailable && h2Available) {
    return "NORMAL";
  }

  // CONSTRAINED: Cooler offline AND (high slope OR time critical OR no bypass)
  if (!coolerAvailable && (slope > 1.5 || timeToNearest < 15 || !bypassAvailable)) {
    return "CONSTRAINED";
  }

  // REDUCED: Cooler offline OR H2 margin limited
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

export function getRecommendation(level, nearest, equipment, coolingCapacity, preheatStatus, slope) {
  const unavailable = Object.entries(equipment).filter(([, v]) => !v).map(([k]) => k);
  
  // Preheat stress takes priority
  if (preheatStatus?.includes("stress") && slope > 1.5) {
    return "Moderate heat-up rate to remain within catalyst envelope.";
  }
  
  // Cooling constrained recommendations
  if (coolingCapacity === "CONSTRAINED") {
    return "Prepare escalation; limited heat removal available.";
  }
  
  if (coolingCapacity === "REDUCED") {
    return "Maximize available cooling paths; monitor response window.";
  }
  
  // Bypass valve available recommendations
  if (unavailable.includes("effluentCooler") && equipment.bypassValve && level >= 1) {
    return "Consider bypass lever if permitted by procedure.";
  }
  
  // Standard escalation recommendations
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
  {
    name: "9. Four-Stage Escalation Sequence",
    samples: [348, 350, 352, 354, 356],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 100000,
    sensorQuality: "good",
    opMode: "steady",
    isSequence: true,
    stages: [
      { samples: [348, 350, 352, 354, 356], equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true } },
      { samples: [356, 358, 360, 362, 364], equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true } },
      { samples: [364, 366, 368, 370, 372], equipment: { preheatExchanger: true, effluentCooler: false, bypassValve: true, h2Compressor: true } },
      { samples: [372, 374, 376, 378, 380], equipment: { preheatExchanger: true, effluentCooler: false, bypassValve: true, h2Compressor: false } },
    ]
  },
];

// Operational Escalation Demonstration - 8 stage showcase
export const DEMONSTRATION_STAGES = [
  {
    name: "Stage 1: Stable Baseline",
    samples: [330, 330.1, 330, 330.2, 330.1],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 100000,
    sensorQuality: "good",
    opMode: "steady",
    preheatActive: false,
    message: "System stable — No constraint pressure",
  },
  {
    name: "Stage 2: Subtle Drift",
    samples: [340, 342, 344, 346, 348],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 102000,
    sensorQuality: "good",
    opMode: "steady",
    preheatActive: false,
    message: "Early foresight — Detected before alarms activate",
  },
  {
    name: "Stage 3: Ramp-Rate Anomaly",
    samples: [338, 342, 346, 350, 354],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: 1.5 },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 108000,
    sensorQuality: "good",
    opMode: "transient",
    preheatActive: false,
    message: "Dynamic instability detected — Ramp exceeds threshold",
  },
  {
    name: "Stage 4: Preheat Envelope Active",
    samples: [290, 293, 296, 299, 302],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 95000,
    sensorQuality: "good",
    opMode: "transient",
    preheatActive: true,
    message: "Catalyst envelope sensitivity active",
  },
  {
    name: "Stage 5: Cooling Reduced",
    samples: [352, 354, 356, 358, 360],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: false },
    feedFlow: 105000,
    sensorQuality: "good",
    opMode: "steady",
    preheatActive: false,
    message: "Cooling authority limited — Response window compressed",
  },
  {
    name: "Stage 6: Cooling Constrained",
    samples: [358, 360, 362, 364, 366],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: false, bypassValve: false, h2Compressor: true },
    feedFlow: 110000,
    sensorQuality: "good",
    opMode: "transient",
    preheatActive: false,
    message: "Heat removal constrained — Corrective levers limited",
  },
  {
    name: "Stage 7: H2 Margin Limited",
    samples: [348, 351, 354, 357, 360],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: false },
    feedFlow: 107000,
    sensorQuality: "good",
    opMode: "transient",
    preheatActive: false,
    message: "Control authority limited — Hydrogen margin reduced",
  },
  {
    name: "Stage 8: Immediate Risk",
    samples: [372, 374, 376, 378, 380],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: false, bypassValve: false, h2Compressor: false },
    feedFlow: 115000,
    sensorQuality: "good",
    opMode: "transient",
    preheatActive: false,
    message: "Immediate escalation required — Full compression event",
  },
];

// Hot Spot Avoided Scenario (Bonus - Manual Selection Only)
export const HOT_SPOT_SCENARIO = {
  name: "Hot Spot Avoided (Bonus Demo)",
  isSequence: true,
  stages: [
    {
      name: "Stage A: Bed Imbalance Begins",
      samples: [345, 347, 349, 351, 353],
      limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
      equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
      feedFlow: 102000,
      sensorQuality: "good",
      opMode: "steady",
      preheatActive: false,
      message: "Bed imbalance detected — Risk MEDIUM",
    },
    {
      name: "Stage B: Conditions Worsen",
      samples: [353, 356, 359, 362, 365],
      limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
      equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: false },
      feedFlow: 108000,
      sensorQuality: "good",
      opMode: "transient",
      preheatActive: false,
      message: "Imbalance SEVERE — Hot spot risk HIGH",
    },
    {
      name: "Stage C: Mitigation Demonstrated",
      samples: [362, 362, 361, 360, 359],
      limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
      equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
      feedFlow: 98000,
      sensorQuality: "good",
      opMode: "steady",
      preheatActive: false,
      message: "Moderation restored — Risk reduced to MEDIUM",
    },
  ],
};