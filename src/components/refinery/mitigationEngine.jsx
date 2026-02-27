// Mitigation Engine — Per-action delay + ramp dynamics (demo-tuned)
// Each lever has: delaySec (before any effect), rampSec (0→max over this),
// and maxEffect (fraction of RoR removed at full engagement).

export const ACTION_PARAMS = {
  feed:    { delaySec: 1,  rampSec: 6,  maxEffect: 0.25 },
  h2:      { delaySec: 1,  rampSec: 8,  maxEffect: 0.20 },
  cooling: { delaySec: 2,  rampSec: 12, maxEffect: 0.30 },
};

/**
 * Compute the current effect fraction for a single lever.
 * @param {number|null} startTs  — Date.now() when lever was turned ON, or null if OFF
 * @param {'feed'|'h2'|'cooling'} action
 * @returns {number}  0 → maxEffect
 */
export function getLeverEffect(startTs, action) {
  if (startTs === null) return 0;
  const { delaySec, rampSec, maxEffect } = ACTION_PARAMS[action];
  const elapsedSec = (Date.now() - startTs) / 1000;
  if (elapsedSec < delaySec) return 0;
  const rampElapsed = elapsedSec - delaySec;
  const t = Math.min(1, rampElapsed / rampSec); // 0 → 1
  return t * maxEffect;
}

/**
 * Compute total mitigation factor and effective RoR from per-lever timestamps.
 * Total effect is additive and clamped to 0.55 maximum.
 *
 * @param {number} baseRoR
 * @param {{ feedTs: number|null, h2Ts: number|null, coolingTs: number|null }} timestamps
 * @returns {{ effectiveRoR, totalEffect, leverEffects }}
 */
export function computeMitigatedRoR(baseRoR, timestamps) {
  const { feedTs = null, h2Ts = null, coolingTs = null } = timestamps || {};

  // Priority order: Feed (1st), Cooling (2nd), H2 (3rd)
  // Diminishing multipliers: 1.0 / 0.8 / 0.6 based on rank among active levers
  const MULTIPLIERS = [1.0, 0.8, 0.6];
  const levers = [
    { ts: feedTs,    action: 'feed' },
    { ts: coolingTs, action: 'cooling' },
    { ts: h2Ts,      action: 'h2' },
  ];
  const active = levers.filter(l => l.ts !== null);
  const effects = { feed: 0, h2: 0, cooling: 0 };
  active.forEach((lever, rank) => {
    const base = getLeverEffect(lever.ts, lever.action);
    effects[lever.action] = base * MULTIPLIERS[rank];
  });

  const feedEff    = effects.feed;
  const h2Eff      = effects.h2;
  const coolingEff = effects.cooling;

  const totalEffect = Math.min(0.55, feedEff + h2Eff + coolingEff);
  const effectiveRoR = Math.max(0.03, baseRoR * (1 - totalEffect));

  return {
    baseRoR,
    effectiveRoR,
    totalEffect,
    leverEffects: { feed: feedEff, h2: h2Eff, cooling: coolingEff },
  };
}

export function computeMitigatedTimeToLimit(currentTemp, limitTemp, effectiveRoR) {
  if (effectiveRoR <= 0) return Infinity;
  const margin = limitTemp - currentTemp;
  if (margin <= 0) return 0;
  return margin / effectiveRoR;
}

// Soft ceiling on calculated TTL per system state (display guard only)
export function clampTimeToBaseline(calculatedTTL, uiState) {
  if (uiState === "IMMEDIATE_RISK") return Math.min(calculatedTTL, 15);
  if (uiState === "SEVERE_DRIFT")   return Math.min(calculatedTTL, 30);
  if (uiState === "EARLY_DRIFT")    return Math.min(calculatedTTL, 50);
  return calculatedTTL;
}