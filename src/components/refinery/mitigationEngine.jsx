// Dynamic Mitigation Engine — Rate-of-Rise Reduction with Diminishing Returns

// RoR reduction fractions per lever per state.
// Higher = more aggressive effect on rate-of-rise.
const LEVER_IMPACT = {
  cooling: {
    NORMAL:         0.45,
    EARLY_DRIFT:    0.42,
    SEVERE_DRIFT:   0.38,  // largest lever — control valves fully open
    IMMEDIATE_RISK: 0.25,
  },
  hydrogen: {
    NORMAL:         0.40,
    EARLY_DRIFT:    0.36,
    SEVERE_DRIFT:   0.32,  // medium-strong quench authority
    IMMEDIATE_RISK: 0.18,
  },
  feedReduction: {
    NORMAL:         0.35,
    EARLY_DRIFT:    0.30,
    SEVERE_DRIFT:   0.25,  // medium — less immediate than cooling/H2
    IMMEDIATE_RISK: 0.15,
  },
};

export function computeMitigatedRoR(baseRoR, equipment, uiState, feedReductionOverride = false) {
  const state = uiState || "NORMAL";
  
  // Determine active levers
  const coolingActive = equipment.effluentCooler;
  const hydrogenActive = equipment.h2Compressor;
  // feedReduction: active if bypassValve available OR explicitly overridden by interactive toggle
  const feedReductionActive = equipment.bypassValve || feedReductionOverride;
  
  // Get impact factors for current state
  const coolingImpact = coolingActive ? LEVER_IMPACT.cooling[state] : 0;
  const hydrogenImpact = hydrogenActive ? LEVER_IMPACT.hydrogen[state] : 0;
  const feedImpact = feedReductionActive ? LEVER_IMPACT.feedReduction[state] : 0;
  
  // Diminishing returns formula
  const totalMitigationFactor = 
    1 - ((1 - coolingImpact) * (1 - hydrogenImpact) * (1 - feedImpact));
  
  // Apply mitigation
  const effectiveRoR = baseRoR * (1 - totalMitigationFactor);
  
  return {
    baseRoR,
    effectiveRoR,
    totalMitigationFactor,
    leverImpacts: {
      cooling: coolingImpact,
      hydrogen: hydrogenImpact,
      feedReduction: feedImpact,
    },
  };
}

export function computeMitigatedTimeToLimit(currentTemp, limitTemp, effectiveRoR) {
  if (effectiveRoR <= 0) return Infinity;
  const margin = limitTemp - currentTemp;
  if (margin <= 0) return 0;
  return margin / effectiveRoR;
}

// Smoothing utility to prevent instant jumps
export function smoothTransition(currentValue, targetValue, smoothingFactor = 0.15) {
  // Exponential smoothing: new = current + (target - current) * factor
  return currentValue + (targetValue - currentValue) * smoothingFactor;
}

// Baseline reference for NORMAL scenario (prevents over-extension)
const NORMAL_BASELINE_TTL = 60; // ~60 minutes baseline for NORMAL

export function clampTimeToBaseline(calculatedTTL, uiState) {
  // In IMMEDIATE_RISK, cap improvement to show noticeable but limited effect
  if (uiState === "IMMEDIATE_RISK") {
    return Math.min(calculatedTTL, 15); // Max ~15 min in immediate risk
  }
  if (uiState === "SEVERE_DRIFT") {
    return Math.min(calculatedTTL, 30); // Max ~30 min in severe drift
  }
  if (uiState === "EARLY_DRIFT") {
    return Math.min(calculatedTTL, 50); // Max ~50 min in early drift
  }
  // NORMAL - no artificial cap
  return calculatedTTL;
}