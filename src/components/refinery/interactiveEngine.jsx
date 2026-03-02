/**
 * interactiveEngine.jsx
 * Self-contained simulation engine for Interactive Mode only.
 * Presentation Mode is completely unaffected by this module.
 *
 * Exports:
 *   initInteractiveState(limits)  → initialState
 *   stepInteractiveState(state, inputs, dtMs) → nextState
 */

import { computeMultiVarTTL, getSystemState } from "@/components/refinery/calcEngine";

// ── Desired RoR by drift mode ─────────────────────────────────────────────────
const DESIRED_ROR = {
  NORMAL:         0.18,
  EARLY_DRIFT:    0.42,
  SEVERE_DRIFT:   0.95,
  IMMEDIATE_RISK: 1.45,
};

// ── Action ramp config ────────────────────────────────────────────────────────
// rampInSec: seconds to go from 0 → 1 (per tick via lag)
// rampOutSec: seconds to go from 1 → 0 when deactivated
// maxImpact: max fractional reduction of desiredRoR
const ACTION_CONFIG = {
  feed:    { rampInSec: 8,  rampOutSec: 6,  maxImpact: 0.25 },
  quench:  { rampInSec: 18, rampOutSec: 12, maxImpact: 0.20 },
  cooling: { rampInSec: 28, rampOutSec: 18, maxImpact: 0.20 },
};

// ── Cooler outlet model (interactive only) ────────────────────────────────────
// Stable reactor (≤360°C) → stays near 48–55°C (no binding constraint)
// Stressed reactor (>360°C) → rises steeply into alarm territory
function deriveCoolerOutC(reactorOutC) {
  const base = 48;
  const delta = Math.max(0, reactorOutC - 360);
  return Math.min(110, base + delta * 2.8);
}

// ── Clamp helper ──────────────────────────────────────────────────────────────
function clamp(val, lo, hi) {
  return Math.max(lo, Math.min(hi, val));
}

// ── First-order lag helper ────────────────────────────────────────────────────
// lagSec: time constant (seconds). dtMs: elapsed milliseconds.
function lagStep(current, target, lagSec, dtMs) {
  const alpha = clamp(dtMs / (lagSec * 1000), 0, 1);
  return current + (target - current) * alpha;
}

// ── Public: initialize state ──────────────────────────────────────────────────
export function initInteractiveState(limits) {
  const safeLimits = limits || { hi: 370, hihi: 380, trip: 390, spec: "", rampRate: "" };
  const temp = 352.0; // NORMAL mid-band seed: huge margin, calm
  const ror  = 0.18;
  const coolerOutC = deriveCoolerOutC(temp);
  const { finalTTL } = computeMultiVarTTL(temp, safeLimits, ror);

  return {
    tempReactorOutC: temp,
    rorCpm:          ror,
    coolerOutC,
    ttlMin:          finalTTL,
    ttlShownMin:     finalTTL,
    systemState:     getSystemState(finalTTL),
    actionEffects: {
      feed:    0,
      quench:  0,
      cooling: 0,
    },
    lastUpdateTs: Date.now(),
  };
}

// ── Public: advance state by dtMs milliseconds ───────────────────────────────
// inputs = {
//   driftMode: "NORMAL"|"EARLY_DRIFT"|"SEVERE_DRIFT"|"IMMEDIATE_RISK",
//   limits: { hi, hihi, trip, spec, rampRate },
//   actions: { feedReduction: bool, quenchBoost: bool, coolingBoost: bool }
// }
export function stepInteractiveState(state, inputs, dtMs) {
  const { driftMode = "NORMAL", limits, actions = {} } = inputs;
  const safeLimits = limits || { hi: 370, hihi: 380, trip: 390, spec: "", rampRate: "" };

  // ── 1. Ramp action effect scalars (first-order lag, per action) ─────────────
  const newEffects = { ...state.actionEffects };
  for (const [key, cfg] of Object.entries(ACTION_CONFIG)) {
    const actionKey = key === 'feed' ? 'feedReduction' : key === 'quench' ? 'quenchBoost' : 'coolingBoost';
    const isOn = !!actions[actionKey];
    const target = isOn ? 1 : 0;
    const lagSec = isOn ? cfg.rampInSec : cfg.rampOutSec;
    newEffects[key] = lagStep(newEffects[key], target, lagSec, dtMs);
  }

  // ── 2. Compute total mitigation effect on desiredRoR ─────────────────────────
  const totalEffect = clamp(
    newEffects.feed    * ACTION_CONFIG.feed.maxImpact +
    newEffects.quench  * ACTION_CONFIG.quench.maxImpact +
    newEffects.cooling * ACTION_CONFIG.cooling.maxImpact,
    0, 0.55
  );

  // ── 3. desiredRoR: process setpoint for this drift mode, reduced by actions ──
  const baseDesired         = DESIRED_ROR[driftMode] ?? DESIRED_ROR.NORMAL;
  const effectiveDesiredRoR = baseDesired * (1 - totalEffect);

  // ── 4. RoR inertia: simRoR lazily tracks effectiveDesiredRoR ──────────────────
  // roRLagSec: how many seconds to cover most of the gap (63% per tau)
  const ROR_LAG_SEC = 16; // ~16s time constant → slow, realistic
  let rorCpm = lagStep(state.rorCpm, effectiveDesiredRoR, ROR_LAG_SEC, dtMs);

  // ── 5. Small process jitter on RoR only ──────────────────────────────────────
  rorCpm += (Math.random() - 0.5) * 0.04;
  rorCpm  = clamp(rorCpm, 0.08, 1.70);

  // ── 6. Integrate reactor temperature ────────────────────────────────────────
  const dtMin = dtMs / 60000;
  let temp = state.tempReactorOutC + rorCpm * dtMin;

  // Optional: tiny PV noise in NORMAL to look alive
  if (driftMode === "NORMAL") {
    temp += (Math.random() - 0.5) * 0.02;
  }

  // ── 7. Derive cooler outlet ──────────────────────────────────────────────────
  const coolerOutC = deriveCoolerOutC(temp);

  // ── 8. Compute raw TTL (reactor + cooler min) ─────────────────────────────────
  const { finalTTL } = computeMultiVarTTL(temp, safeLimits, rorCpm);
  const ttlMin = finalTTL;

  // ── 9. Display smoothing — asymmetric EMA, no pinning, no dwell ───────────────
  const prevShown = state.ttlShownMin;
  const alpha     = ttlMin < prevShown ? 0.22 : 0.16;
  const ttlShownMin = Math.max(0, prevShown + alpha * (ttlMin - prevShown));

  // ── 10. Derive system state from smoothed TTL ─────────────────────────────────
  const systemState = getSystemState(ttlShownMin);

  return {
    tempReactorOutC: temp,
    rorCpm,
    coolerOutC,
    ttlMin,
    ttlShownMin,
    systemState,
    actionEffects: newEffects,
    lastUpdateTs: Date.now(),
  };
}