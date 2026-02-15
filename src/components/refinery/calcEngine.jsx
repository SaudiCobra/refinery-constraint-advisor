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

export function getEscalationLevel(timeMinutes) {
  if (timeMinutes === Infinity || timeMinutes === null) return 0;
  if (timeMinutes > 30) return 0;
  if (timeMinutes > 15) return 1;
  if (timeMinutes > 10) return 2;
  return 3;
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
    name: "Stable Operation",
    samples: [348, 348.2, 348.1, 348.3, 348.2],
    limits: { hi: 370, hihi: 380, spec: 375, trip: 390 },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 100000,
    sensorQuality: "good",
    opMode: "steady",
  },
  {
    name: "Drift Toward High",
    samples: [355, 357, 359, 361, 363],
    limits: { hi: 370, hihi: 380, spec: 375, trip: 390 },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 100000,
    sensorQuality: "good",
    opMode: "steady",
  },
  {
    name: "Fast Rise to High-High (~10 min)",
    samples: [362, 364, 366, 368, 370],
    limits: { hi: 370, hihi: 380, spec: 375, trip: 390 },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 105000,
    sensorQuality: "good",
    opMode: "transient",
  },
  {
    name: "Cooling Constrained",
    samples: [358, 360, 362, 364, 366],
    limits: { hi: 370, hihi: 380, spec: 375, trip: 390 },
    equipment: { preheatExchanger: false, effluentCooler: false, bypassValve: true, h2Compressor: true },
    feedFlow: 100000,
    sensorQuality: "good",
    opMode: "steady",
  },
  {
    name: "Hydrogen Margin Limited",
    samples: [360, 362, 364, 366, 368],
    limits: { hi: 370, hihi: 380, spec: 375, trip: 390 },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: false },
    feedFlow: 110000,
    sensorQuality: "suspect",
    opMode: "transient",
  },
];