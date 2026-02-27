// Mitigation Engine — Realistic corrective action dynamics
// Feed reduction: 25% immediate
// Hydrogen/quench: 20% immediate, capped at 30% total H2 influence
// Cooling: ramps from 0→30% over ~12 seconds (thermal inertia)

// Cooling ramp state — tracks elapsed seconds since activation.
// Stored outside React so the physics tick can read it synchronously.
let _coolingRampSeconds = 0;
const COOLING_RAMP_DURATION = 12; // seconds to reach full effect
const COOLING_FULL_EFFECT   = 0.30;

// Called every tick (1 s). Returns current cooling reduction fraction 0→0.30.
export function tickCoolingRamp(coolingActive) {
  if (!coolingActive) {
    // Decay faster than ramp so deactivation is visible but not instant
    _coolingRampSeconds = Math.max(0, _coolingRampSeconds - 1.5);
  } else {
    _coolingRampSeconds = Math.min(COOLING_RAMP_DURATION, _coolingRampSeconds + 1);
  }
  const t = _coolingRampSeconds / COOLING_RAMP_DURATION; // 0→1
  return t * COOLING_FULL_EFFECT;
}

export function resetCoolingRamp() {
  _coolingRampSeconds = 0;
}

export function getCoolingRampFactor() {
  const t = _coolingRampSeconds / COOLING_RAMP_DURATION;
  return t * COOLING_FULL_EFFECT;
}

/**
 * Compute the mitigated RoR given active levers.
 *
 * effectiveRoR = baseRoR
 *   * (1 - feedFraction)       // feed: 25% flat
 *   * (1 - hydrogenFraction)   // H2:   20% flat, total capped at 30%
 *   * (1 - coolingRampFactor)  // cooling: 0→30% over 12 s
 *
 * @param {number} baseRoR
 * @param {object} flags  { feedActive, hydrogenActive, coolingActive }
 * @param {number} coolingRampFactor  0→0.30, from tickCoolingRamp()
 */
export function computeMitigatedRoR(baseRoR, flags = {}, coolingRampFactor = 0) {
  const { feedActive = false, hydrogenActive = false, coolingActive = false } = flags;

  const feedFraction     = feedActive     ? 0.25 : 0;
  // H2 capped: even if something else is stacked, hydrogen alone can't exceed 30% total
  const hydrogenFraction = hydrogenActive ? Math.min(0.20, 0.30 - feedFraction) : 0;
  const coolingFraction  = coolingActive  ? coolingRampFactor : 0;

  let effective = baseRoR
    * (1 - feedFraction)
    * (1 - hydrogenFraction)
    * (1 - coolingFraction);

  // Hard floor: never go below 0.03 °C/min
  effective = Math.max(0.03, effective);

  return {
    baseRoR,
    effectiveRoR: effective,
    leverImpacts: {
      feedReduction: feedFraction,
      hydrogen:      hydrogenFraction,
      cooling:       coolingFraction,
    },
    totalMitigationFactor: 1 - (effective / baseRoR),
  };
}

export function computeMitigatedTimeToLimit(currentTemp, limitTemp, effectiveRoR) {
  if (effectiveRoR <= 0) return Infinity;
  const margin = limitTemp - currentTemp;
  if (margin <= 0) return 0;
  return margin / effectiveRoR;
}

// Smoothing utility — cap change per call to prevent display lurching
export function smoothTransition(currentValue, targetValue, maxDelta = 2) {
  const delta = targetValue - currentValue;
  const capped = Math.max(-maxDelta, Math.min(maxDelta, delta));
  return currentValue + capped;
}

// Soft ceiling on calculated TTL per system state (display guard only)
export function clampTimeToBaseline(calculatedTTL, uiState) {
  if (uiState === "IMMEDIATE_RISK") return Math.min(calculatedTTL, 15);
  if (uiState === "SEVERE_DRIFT")   return Math.min(calculatedTTL, 30);
  if (uiState === "EARLY_DRIFT")    return Math.min(calculatedTTL, 50);
  return calculatedTTL;
}