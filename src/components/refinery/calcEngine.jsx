// Calculation engine for rate-of-rise and time-to-constraint projections

// ── Limits normalization ──────────────────────────────────────────────────────
// Single source of truth — call this everywhere before using limits.
const DEFAULT_LIMITS = { hi: 370, hihi: 380, trip: 390, spec: "", rampRate: "" };

export function normalizeLimits(limits, defaults = DEFAULT_LIMITS) {
  if (!limits) return { ...defaults };
  return {
    hi:       limits.hi       ?? defaults.hi,
    hihi:     limits.hihi     ?? defaults.hihi,
    trip:     limits.trip     ?? defaults.trip,
    spec:     limits.spec     ?? defaults.spec,
    rampRate: limits.rampRate ?? defaults.rampRate,
  };
}

export function computeRateOfRise(samples, interval) {
  const now = samples[samples.length - 1];
  const prev = samples[samples.length - 2];
  if (now == null || prev == null) return 0;
  return (now - prev) / interval;
}

export function computeTimeToLimit(currentValue, limitValue, slope) {
  if (slope <= 0) return Infinity;
  const margin = limitValue - currentValue;
  if (margin <= 0) return 0;
  return margin / slope;
}

// Legacy alias
export const computeTimeToConstraint = computeTimeToLimit;

export function computeAllConstraints(currentValue, limits, slope) {
  const constraints = [];
  // Guard: never let undefined limits reach this function
  limits = normalizeLimits(limits);
  
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
    constraints.push({ name: "Ramp-rate", value: Number(limits.rampRate), time: slope > Number(limits.rampRate) ? 0 : Infinity, margin: Number(limits.rampRate) - slope });
  }

  return constraints.sort((a, b) => a.time - b.time);
}

export function getNearestConstraint(constraints) {
  const positive = constraints.filter(c => c.time >= 0 && c.time < Infinity);
  return positive.length > 0 ? positive[0] : null;
}

// ── Structured escalation band — requires BOTH slope AND absolute temps ────────
// Single source of truth for band classification. Returns:
// "NORMAL" | "EARLY_DRIFT" | "SEVERE_DRIFT" | "IMMEDIATE_RISK"
export function getEscalationBand(slopeCpm, reactorOutC, coolerOutC) {
  const s = slopeCpm   ?? 0;
  const r = reactorOutC ?? 0;
  const c = coolerOutC  ?? 0;

  // IMMEDIATE_RISK: all three must reach the band
  if (s > 1.2 && r >= 380 && c >= 95) return "IMMEDIATE_RISK";

  // SEVERE_DRIFT: slope in range AND at least one absolute temp in band
  if (s >= 0.7 && s <= 1.1 && r >= 372 && c >= 75) return "SEVERE_DRIFT";

  // EARLY_DRIFT
  if (s >= 0.3 && s <= 0.6 && r >= 365 && c >= 55) return "EARLY_DRIFT";

  // STABLE: slope low AND both temps below drift onset
  if (s <= 0.25 && r < 370 && c < 55) return "NORMAL";

  // Partial-match fallback: take highest band only if absolute temps qualify
  if (s > 1.2) {
    if (r >= 380 && c >= 95) return "IMMEDIATE_RISK";
    if (r >= 372 && c >= 75) return "SEVERE_DRIFT";
    if (r >= 365 && c >= 55) return "EARLY_DRIFT";
    return "NORMAL";
  }
  if (s >= 0.7) {
    if (r >= 372 && c >= 75) return "SEVERE_DRIFT";
    if (r >= 365 && c >= 55) return "EARLY_DRIFT";
    return "NORMAL";
  }
  if (s >= 0.3) {
    if (r >= 365 && c >= 55) return "EARLY_DRIFT";
    return "NORMAL";
  }
  return "NORMAL";
}

// NEW 4-band model — single source of truth for all state derivation
// NORMAL: > 30 min | EARLY_DRIFT: 12–30 | SEVERE_DRIFT: 4–12 | IMMEDIATE_RISK: ≤ 4
export function getSystemState(timeMinutes) {
  if (timeMinutes === Infinity || timeMinutes == null || timeMinutes > 30) return "NORMAL";
  if (timeMinutes > 12) return "EARLY_DRIFT";
  if (timeMinutes > 4)  return "SEVERE_DRIFT";
  return "IMMEDIATE_RISK";
}

// Hysteresis thresholds: separate ENTER vs EXIT per transition
// ENTER thresholds (going worse): NORMAL→EARLY ≤30, EARLY→SEVERE ≤12, SEVERE→IMMEDIATE ≤4
// EXIT thresholds (going better):  EARLY→NORMAL ≥33, SEVERE→EARLY ≥14, IMMEDIATE→SEVERE ≥5
const STATE_ORDER = ["NORMAL", "EARLY_DRIFT", "SEVERE_DRIFT", "IMMEDIATE_RISK"];
const ENTER_TTL   = [30, 12, 4];   // TTL at which you enter each non-NORMAL state
const EXIT_TTL    = [33, 14, 5];   // TTL at which you exit back to safer state

export function getSystemStateWithHysteresis(rawTTL, prevState) {
  const prevIdx = STATE_ORDER.indexOf(prevState);
  const safeIdx = prevIdx < 0 ? 0 : prevIdx;

  // Try to move one step worse
  if (safeIdx < STATE_ORDER.length - 1) {
    const enterThreshold = ENTER_TTL[safeIdx];
    if (rawTTL <= enterThreshold) {
      return STATE_ORDER[safeIdx + 1]; // one step worse
    }
  }

  // Try to move one step better
  if (safeIdx > 0) {
    const exitThreshold = EXIT_TTL[safeIdx - 1];
    if (rawTTL >= exitThreshold) {
      return STATE_ORDER[safeIdx - 1]; // one step better
    }
  }

  // Stay in current state
  return prevState;
}

export function getEscalationLevel(timeMinutes, preheatActive, slope, coolingCapacity) {
  const state = getSystemState(timeMinutes);
  let baseLevel =
    state === "IMMEDIATE_RISK" ? 3 :
    state === "SEVERE_DRIFT"   ? 2 :
    state === "EARLY_DRIFT"    ? 1 : 0;

  if (preheatActive && slope > 1.5) {
    baseLevel = Math.max(baseLevel, 2);
  }
  if (coolingCapacity === "SEVERELY_LIMITED" && timeMinutes < 10) {
    baseLevel = Math.min(baseLevel + 1, 3);
  }
  return baseLevel;
}

export function computeCoolingCapacity(equipment, slope, timeToNearest) {
  const coolerAvailable = equipment.effluentCooler;
  const h2Available = equipment.h2Compressor;
  const bypassAvailable = equipment.bypassValve;

  if (coolerAvailable && h2Available) {
    return "NORMAL";
  }

  if (!coolerAvailable && (slope > 1.5 || timeToNearest < 15 || !bypassAvailable)) {
    return "SEVERELY_LIMITED";
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
  if (coolingCapacity === "SEVERELY_LIMITED") {
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
  
  if (preheatStatus?.includes("stress") && slope > 1.5) {
    return "Moderate heat-up rate to remain within catalyst envelope.";
  }
  
  if (coolingCapacity === "SEVERELY_LIMITED") {
    return "Prepare escalation; limited heat removal available.";
  }
  
  if (coolingCapacity === "REDUCED") {
    return "Maximize available cooling paths; monitor response window.";
  }
  
  if (unavailable.includes("effluentCooler") && equipment.bypassValve && level >= 1) {
    return "Consider bypass lever if permitted by procedure.";
  }
  
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

// ── Cooler limits (effluent cooler outlet temperature, °C) ────────────────────
export const COOLER_LIMITS = { hi: 90, hihi: 100, trip: 110, spec: "", rampRate: "" };

// ── Derive cooler outlet temperature from reactor outlet temperature ───────────
// Realistic ratio: cooler outlet tracks reactor at ~25% of absolute value above a base of ~40°C.
// e.g. reactorOut=370 → coolerOut ≈ 40 + (370-280)*0.6 = 94°C
// This keeps cooler temps in a realistic 55–110°C band across the full reactor range (280–390°C).
export function deriveCoolerOutC(reactorOutC) {
  const base = 45;
  const delta = Math.max(0, reactorOutC - 360);
  return Math.min(110, base + delta * 2.75);
}

// ── Compute combined (multi-variable) TTL ─────────────────────────────────────
// Returns { finalTTL, ttlReactor, ttlCooler, reactorOutC, coolerOutC } so
// callers can inspect which constraint is tightest for driver attribution.
export function computeMultiVarTTL(reactorOutC, reactorLimits, slope) {
  const rLimits = normalizeLimits(reactorLimits);
  const reactorConstraints = computeAllConstraints(reactorOutC, rLimits, slope);
  const reactorNearest = getNearestConstraint(reactorConstraints);
  const ttlReactor = reactorNearest ? reactorNearest.time : Infinity;

  const coolerOutC = deriveCoolerOutC(reactorOutC);
  // Cooler outlet rises at ~60% of reactor slope
  const slopeCooler = slope * 0.6;
  const coolerConstraints = computeAllConstraints(coolerOutC, COOLER_LIMITS, slopeCooler);
  const coolerNearest = getNearestConstraint(coolerConstraints);
  const ttlCooler = coolerNearest ? coolerNearest.time : Infinity;

  const finalTTL = Math.min(ttlReactor, ttlCooler);
  return { finalTTL, ttlReactor, ttlCooler, reactorOutC, coolerOutC };
}

// ── Dominant Driver — single source of truth ──────────────────────────────────
// Deterministic, auditable. Driven by which constraint is actually tightening TTL.
// Returns { driver, driverLine }
export function getDominantDriver({
  ttlReactor,
  ttlCooler,
  finalTTL,
  slopeCpm,
  equipment = {},
  sensorQuality = "good",
}) {
  // 1. Sensor conflict overrides everything — cannot confirm physical driver
  if (sensorQuality === "suspect") {
    return {
      driver: "Sensor conflict",
      driverLine: "Signal inconsistency detected — dominant driver not confirmed.",
    };
  }

  // 2. H₂ compressor unavailable AND slope high → quench limitation
  if (!equipment.h2Compressor && slopeCpm > 0.8) {
    return {
      driver: "H₂ quench limitation",
      driverLine: "Hydrogen moderation unavailable — quench margin eliminated.",
    };
  }

  // 3. Cooler is the binding constraint
  if (ttlCooler <= ttlReactor) {
    if (!equipment.effluentCooler) {
      return {
        driver: "Effluent cooling constrained",
        driverLine: "Effluent cooler offline — cooling path eliminated.",
      };
    }
    return {
      driver: "Effluent cooling constrained",
      driverLine: "Cooler outlet temperature is the binding limit.",
    };
  }

  // 4. Reactor temperature acceleration is the binding constraint
  if (slopeCpm > 1.2) {
    return {
      driver: "Reactor temperature acceleration",
      driverLine: "High rate-of-rise is compressing the response window.",
    };
  }
  if (slopeCpm > 0.5) {
    return {
      driver: "Reactor temperature acceleration",
      driverLine: "Sustained temperature rise reducing margin to operating limit.",
    };
  }

  // 5. No dominant driver — system stable
  return {
    driver: "No dominant driver",
    driverLine: "No dominant risk driver identified at current operating point.",
  };
}

// Interactive Mode Demo Scenarios (4 only - scenario-driven with explicit uiState)
// baseRoR per scenario: (highLimit=370 - currentTemp) / targetTTL
// NORMAL:        margin=18, TTL≈60min → baseRoR=0.30°C/min  (step=0.60°C per 2-min interval)
// EARLY_DRIFT:   margin=10, TTL≈29min → baseRoR=0.35°C/min  (step=0.70°C per 2-min interval)
// SEVERE_DRIFT:  margin=8,  TTL≈10min → baseRoR=0.80°C/min  (step=1.60°C per 2-min interval)
// IMMEDIATE_RISK: margin=4, TTL≈3min  → baseRoR=1.35°C/min  (step=2.70°C per 2-min interval)
export const DEMO_SCENARIOS = {
  NORMAL: {
    name: "NORMAL",
    uiState: "NORMAL",
    // currentTemp=352, margin=18, baseRoR=0.30°C/min, TTL=60 min
    samples: [349.6, 350.2, 350.8, 351.4, 352.0],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 84000,
    sensorQuality: "good",
    opMode: "steady",
  },
  EARLY_DRIFT: {
    name: "EARLY_DRIFT",
    uiState: "EARLY_DRIFT",
    // currentTemp=360, margin=10, baseRoR=0.35°C/min, TTL≈28.6 min
    samples: [357.2, 357.9, 358.6, 359.3, 360.0],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 87000,
    sensorQuality: "good",
    opMode: "steady",
  },
  SEVERE_DRIFT: {
    name: "SEVERE_DRIFT",
    uiState: "SEVERE_DRIFT",
    // currentTemp=362, margin=8, baseRoR=0.80°C/min, TTL=10 min
    samples: [355.6, 357.2, 358.8, 360.4, 362.0],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: false, bypassValve: true, h2Compressor: true },
    feedFlow: 91000,
    sensorQuality: "good",
    opMode: "transient",
  },
  IMMEDIATE_RISK: {
    name: "IMMEDIATE_RISK",
    uiState: "IMMEDIATE_RISK",
    // currentTemp=366, margin=4, baseRoR=1.35°C/min, TTL≈2.96 min
    samples: [355.2, 357.9, 360.6, 363.3, 366.0],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: false, bypassValve: true, h2Compressor: false },
    feedFlow: 95000,
    sensorQuality: "good",
    opMode: "transient",
  },
};

// Presentation Mode Scenarios (7 existing scenarios preserved)
export const SCENARIOS = [
  {
    name: "1. Stable Baseline",
    samples: [348.0, 348.0, 348.0, 348.0, 348.0],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 84000,
    sensorQuality: "good",
    opMode: "steady",
  },
  {
    name: "2. Predictive Drift Detection",
    // slope ~0.5°C/min → TTL to hi(370) from 358 = 12÷0.5 = 24 min (Early→Severe as drift progresses)
    samples: [354.0, 355.0, 356.0, 357.0, 358.0],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 88000,
    sensorQuality: "good",
    opMode: "steady",
  },
  {
    name: "3. Dominant Driver Isolation",
    // slope ~0.5°C/min → TTL to hi(370) from 358 = 12÷0.5 = 24 min (Early on load)
    // effluentCooler: true but h2Compressor: false → cooling slightly strained at Severe
    samples: [354.0, 355.0, 356.0, 357.0, 358.0],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: false },
    feedFlow: 88000,
    sensorQuality: "good",
    opMode: "steady",
  },
  {
    name: "4. Four-Level Escalation Sequence",
    samples: [348, 350, 352, 354, 356],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 84000,
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
  {
    name: "5. Hydrogen Moderation Limited",
    samples: [352, 354, 356, 358, 360],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: false },
    feedFlow: 86000,
    sensorQuality: "good",
    opMode: "steady",
  },
  {
    name: "6. False Escalation (Sensor Conflict)",
    samples: [355, 358, 362, 359, 361],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 84000,
    sensorQuality: "suspect",
    opMode: "transient",
  },
  {
    name: "7. True Escalation (Aligned)",
    samples: [365, 367, 369, 371, 373],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 94000,
    sensorQuality: "good",
    opMode: "transient",
  },
  {
    // Stable → Early: h2Compressor false (H2 moderation limiting), cooling normal, mitigation Available
    // Early → Severe: H2 limited, mitigation shifts to Constrained, action ranking reshuffles
    // slope ~0.5°C/min → TTL to hi(370) from 358 = 12÷0.5 = 24 min (Early band)
    name: "8. Multi-Constraint Interaction",
    samples: [354.0, 355.0, 356.0, 357.0, 358.0],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: false },
    feedFlow: 87000,
    sensorQuality: "good",
    opMode: "steady",
  },
  {
    // Stable → Early: sudden temp spike, suspect sensor, moderate confidence, no dominant driver confirmed
    // Early → Severe: signals further misaligned, no aggressive mitigation recommended
    // Recovery: signals resolve, system returns to stable
    name: "9. Signal Conflict",
    isSequence: true,
    stages: [
      { 
        samples: [348.0, 348.0, 348.0, 348.0, 348.0],
        limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
        equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
        sensorQuality: "good",
      },
      { 
        samples: [348.0, 352.0, 356.0, 360.0, 363.0],
        limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
        equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
        sensorQuality: "suspect",
      },
      { 
        samples: [363.0, 363.5, 363.2, 363.6, 363.3],
        limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
        equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
        sensorQuality: "suspect",
      },
      { 
        samples: [363.3, 360.0, 356.0, 352.0, 348.0],
        limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
        equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
        sensorQuality: "good",
      },
    ]
  },
  {
    // Stable → Early: TTL ~30 min (slope ~0.4°C/min), mitigation Available
    // Early progresses: TTL compresses, mitigation shifts Available → Constrained, cooling strains
    // Early → Severe: TTL single-digit (slope ~2°C/min), dominant driver confirmed, High confidence
    // Severe emphasizes cooling chain (effluentCooler offline)
    name: "10. Escalation Window Compression",
    isSequence: true,
    stages: [
      { 
        samples: [348.0, 348.0, 348.0, 348.0, 348.0],
        limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
        equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
        feedFlow: 84000,
        sensorQuality: "good",
        opMode: "steady",
      },
      { 
        samples: [356.0, 357.0, 358.0, 359.0, 360.0],
        limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
        equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
        feedFlow: 87000,
        sensorQuality: "good",
        opMode: "steady",
      },
      { 
        samples: [360.0, 361.5, 363.0, 364.5, 366.0],
        limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
        equipment: { preheatExchanger: true, effluentCooler: false, bypassValve: true, h2Compressor: true },
        feedFlow: 90000,
        sensorQuality: "good",
        opMode: "transient",
      },
      { 
        samples: [366.0, 368.0, 370.0, 372.0, 374.0],
        limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
        equipment: { preheatExchanger: true, effluentCooler: false, bypassValve: true, h2Compressor: false },
        feedFlow: 94000,
        sensorQuality: "good",
        opMode: "transient",
      },
    ]
  },
];

// Operational Demonstration (8 stages - keep for full demo)
export const DEMONSTRATION_STAGES = [
  {
    name: "Stage 1: Stable Baseline",
    samples: [330, 330.1, 330, 330.2, 330.1],
    limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
    equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
    feedFlow: 84000,
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
    feedFlow: 86000,
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
    feedFlow: 90000,
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
    feedFlow: 78000,
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
    feedFlow: 88000,
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
    feedFlow: 92000,
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
    feedFlow: 89000,
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
    feedFlow: 96000,
    sensorQuality: "good",
    opMode: "transient",
    preheatActive: false,
    message: "Immediate escalation required — Full compression event",
  },
];

export const HOT_SPOT_SCENARIO = {
  name: "Hot Spot Avoided (Bonus Demo)",
  isSequence: true,
  stages: [
    {
      name: "Stage A: Bed Imbalance Begins",
      samples: [345, 347, 349, 351, 353],
      limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" },
      equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
      feedFlow: 86000,
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
      feedFlow: 90000,
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
      feedFlow: 80000,
      sensorQuality: "good",
      opMode: "steady",
      preheatActive: false,
      message: "Moderation restored — Risk reduced to MEDIUM",
    },
  ],
};