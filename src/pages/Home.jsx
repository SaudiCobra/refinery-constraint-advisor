import React, { useState, useEffect, useCallback, useRef } from "react";
import GlobalHeader from "@/components/refinery/GlobalHeader";
import AlarmBanner from "@/components/refinery/AlarmBanner";
import HeroMetric from "@/components/refinery/HeroMetric";
import QuickScenarioSelector from "@/components/refinery/QuickScenarioSelector";
import InputPanel from "@/components/refinery/InputPanel";
import ReasoningBlocks from "@/components/refinery/ReasoningBlocks";
import AcknowledgeSystem from "@/components/refinery/AcknowledgeSystem";
import ExecutiveRibbon from "@/components/refinery/ExecutiveRibbon";
import AlarmsOnlyView from "@/components/refinery/AlarmsOnlyView";
import ScenarioSelector from "@/components/refinery/ScenarioSelector";
import PresentationHero from "@/components/refinery/PresentationHero";
import ScenarioAnnouncer from "@/components/refinery/ScenarioAnnouncer";
import PresenterControls from "@/components/refinery/PresenterControls";
import DecisionWindowBar from "@/components/refinery/DecisionWindowBar";
import LeverContext from "@/components/refinery/LeverContext";
import ProcessMap from "@/components/refinery/ProcessMap";
import OpsCapacityPanel from "@/components/refinery/OpsCapacityPanel";
import ManarahButton from "@/components/refinery/ManarahButton";
import ManarahPanel from "@/components/refinery/ManarahPanel";
import {
  computeRateOfRise,
  computeAllConstraints,
  getNearestConstraint,
  getSystemState,
  getEscalationLevel,
  getAlarmState,
  getRecommendation,
  formatTime,
  computeCoolingCapacity,
  adjustTimeToConstraint,
  normalizeLimits,
  SCENARIOS,
  DEMONSTRATION_STAGES,
  HOT_SPOT_SCENARIO,
  DEMO_SCENARIOS,
} from "@/components/refinery/calcEngine";
import {
  computeMitigatedRoR,
  computeMitigatedTimeToLimit,
  clampTimeToBaseline,
  getLeverEffect,
  ACTION_PARAMS,
} from "@/components/refinery/mitigationEngine";
import { ThemeContext } from "@/components/refinery/ThemeContext";
import {
  simulateBedTemperatures,
  computeBedImbalance,
  computeHotSpotRisk,
  adjustEscalationForHotSpot,
} from "@/components/refinery/bedLogic";


const DEFAULTS = {
  varName: "NHT Reactor Inlet Temperature",
  units: "°C",
  interval: 2,
  samples: [348, 349, 350, 351, 352],
  limits: { hi: 370, hihi: 380, spec: 375, trip: 390, rampRate: "" },
  opMode: "steady",
  sensorQuality: "good",
  equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
  feedFlow: 84000,
};

export default function Home() {
  const [theme, setTheme] = useState("dark");
  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");
  const [displayMode, setDisplayMode] = useState("interactive");
  const [alarmsOnly, setAlarmsOnly] = useState(false);
  const [state, setState] = useState({ ...DEFAULTS });
  const [preheatActive, setPreheatActive] = useState(false);

  // ── Preheat warm-up simulation state ─────────────────────────────────────────
  // Tracks the three preheat temperatures independently, rising smoothly from cold.
  const PREHEAT_START = { rit: 200, quench: 195, rot: 190 };
  const PREHEAT_COMPLETE_RIT = 335; // °C — triggers auto-exit
  const [preheatTemps, setPreheatTemps] = useState(PREHEAT_START);
  const [preheatComplete, setPreheatComplete] = useState(false);
  const preheatTempsRef = useRef(PREHEAT_START);
  const preheatCompleteRef = useRef(false);

  // ── Physics simulation state (interactive mode only) ────────────────────────
  // These are the raw physics variables; all display values derive from them.
  const [simTemp,   setSimTemp]   = useState(358.0); // currentOutletTempC — seeds NORMAL mid-band
  const [simRoR,    setSimRoR]    = useState(0.25);  // rateOfRiseC_per_min — seeds NORMAL
  const [simRunning, setSimRunning] = useState(true);
  const [mitigationMsg, setMitigationMsg] = useState("");

  // ── Mitigation toggle state ───────────────────────────────────────────────
  const [feedReductionActive, setFeedReductionActive] = useState(false);
  const [quenchBoostActive,   setQuenchBoostActive]   = useState(false);
  const [coolingBoostActive,  setCoolingBoostActive]  = useState(false);
  // Activation timestamps (null = OFF). Refs so tick reads without stale closure.
  const feedTsRef    = useRef(null);
  const h2TsRef      = useRef(null);
  const coolingTsRef = useRef(null);

  // Smoothed TTL for display (prevents jumps > 3 min per tick)
  const [smoothedTTL, setSmoothedTTL] = useState(null);
  const simTempRef = useRef(358.0);
  const simRoRRef  = useRef(0.25);
  simRoRRef._scenarioBand = simRoRRef._scenarioBand || "NORMAL";

  // ── Band definitions: TTL [lo, hi] in minutes, RoR clamps, and noise ───────
  // These drive both seeding and continuous soft-steering.
  const BAND_CONFIG = {
    NORMAL:         { ttlLo: 35, ttlHi: 60, rorMin: 0.10, rorMax: 0.40, noise: 0.025, steerK: 0.012 },
    EARLY_DRIFT:    { ttlLo: 10, ttlHi: 35, rorMin: 0.28, rorMax: 0.75, noise: 0.035, steerK: 0.018 },
    SEVERE_DRIFT:   { ttlLo:  4, ttlHi: 13, rorMin: 0.60, rorMax: 1.30, noise: 0.045, steerK: 0.030 },
    IMMEDIATE_RISK: { ttlLo:  0.2, ttlHi: 4, rorMin: 1.00, rorMax: 2.20, noise: 0.055, steerK: 0.060 },
  };

  // ── Derive named state from a TTL value — single source of truth ────────────
  const getBandFromTTL = (ttlMin) => {
    if (ttlMin <= 4)  return "IMMEDIATE_RISK";
    if (ttlMin <= 13) return "SEVERE_DRIFT";
    if (ttlMin <= 35) return "EARLY_DRIFT";
    return "NORMAL";
  };

  // Derive computed TTL + state from sim vars (pure function, no state)
  const getSimTTL = (temp, ror, limits) => {
    const limitVal = Number(limits?.hi || 370);
    const margin   = limitVal - temp;
    if (margin <= 0) return 0;
    return margin / Math.max(ror, 0.05);
  };

  // Presentation mode state
  const [presScenario, setPresScenario] = useState(0);
  const [autoCycling, setAutoCycling] = useState(false);
  const [sequenceStage, setSequenceStage] = useState(0);
  const [demonstrationActive, setDemonstrationActive] = useState(false);
  const [demonstrationStage, setDemonstrationStage] = useState(0);
  const cycleRef = useRef(null);
  const sequenceRef = useRef(null);
  const demoRef = useRef(null);

  // ── Preheat warm-up tick ─────────────────────────────────────────────────────
  // Runs independently when preheatActive is true and preheat is not yet complete.
  // RIT rises ~0.35°C/tick (1 s), Quench follows 5°C below, ROT follows 10°C below.
  useEffect(() => {
    if (!preheatActive || preheatCompleteRef.current || displayMode !== "interactive") return;
    const tick = setInterval(() => {
      const prev = preheatTempsRef.current;
      // Slow ramp — 0.30–0.40°C per second with tiny noise for realism
      const noise = (Math.random() - 0.5) * 0.4;
      const newRIT = Math.min(prev.rit + 2.7 + noise, PREHEAT_COMPLETE_RIT + 2);
      const newQuench = newRIT - 5 + (Math.random() - 0.5) * 0.08;
      const newROT = newRIT - 10 + (Math.random() - 0.5) * 0.08;
      const next = { rit: newRIT, quench: newQuench, rot: Math.min(newROT, newRIT - 1) };
      preheatTempsRef.current = next;
      setPreheatTemps({ ...next });

      // Auto-complete
      if (newRIT >= PREHEAT_COMPLETE_RIT && !preheatCompleteRef.current) {
        preheatCompleteRef.current = true;
        setPreheatComplete(true);
        // After 3 s showing "Preheat Complete", restore normal sim
        setTimeout(() => {
          setPreheatActive(false);
          setPreheatComplete(false);
          preheatCompleteRef.current = false;
          preheatTempsRef.current = PREHEAT_START;
          setPreheatTemps(PREHEAT_START);
        }, 3000);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [preheatActive, displayMode]);

  // Reset preheat state when toggled off manually
  useEffect(() => {
    if (!preheatActive) {
      preheatCompleteRef.current = false;
      setPreheatComplete(false);
      preheatTempsRef.current = PREHEAT_START;
      setPreheatTemps(PREHEAT_START);
    }
  }, [preheatActive]);

  // ── Real-time physics tick (1 000 ms = 1/90 of a demo-minute) ───────────────
  // DT = 1/90 min per real second — slower than before so the countdown feels
  // realistic rather than "fast AF". Band steering keeps TTL in the named band.
  useEffect(() => {
    if (!simRunning || displayMode !== "interactive") return;
    const DT = 1 / 90; // real seconds → demo minutes (slowed from 1/60)

    const tick = setInterval(() => {
      let temp = simTempRef.current;
      let ror  = simRoRRef.current;
      const limits = state.limits;

      // Current TTL and which named scenario band was selected
      const currentTTL  = getSimTTL(temp, ror, limits);
      const scenarioBand = simRoRRef._scenarioBand || "NORMAL";
      const cfg = BAND_CONFIG[scenarioBand] || BAND_CONFIG.NORMAL;

      // Check if all 3 levers are ON and each has completed its full ramp
      const checkFullRamp = (tsMs, action) => {
        if (tsMs === null) return false;
        const { delaySec, rampSec } = ACTION_PARAMS[action];
        return (Date.now() - tsMs) / 1000 >= delaySec + rampSec;
      };
      const allFullMitigation =
        checkFullRamp(feedTsRef.current,    'feed')    &&
        checkFullRamp(h2TsRef.current,      'h2')      &&
        checkFullRamp(coolingTsRef.current, 'cooling');

      // Count active levers for decay scaling
      const activeLeverCount = [feedTsRef.current, h2TsRef.current, coolingTsRef.current].filter(ts => ts !== null).length;
      // decayScale reduces worsening forces (band steering + noise) per active lever count
      const decayScaleByCount = [1.00, 0.75, 0.35, 0.15];
      const decayScale = decayScaleByCount[activeLeverCount] ?? 1.00;

      // 1. Random RoR wander — scaled down when levers are active
      const rorNoise = (Math.random() - 0.5) * 2 * cfg.noise * decayScale;
      ror = ror + rorNoise;

      // 2. Soft band-steering — DISABLED during full recovery to avoid fighting it
      if (!allFullMitigation) {
        if (currentTTL > cfg.ttlHi) {
          // TTL too high → nudge RoR up (more worsening) — scale down when mitigating
          const excess = currentTTL - cfg.ttlHi;
          ror += cfg.steerK * excess * decayScale;
        } else if (currentTTL < cfg.ttlLo) {
          // TTL too low → nudge RoR down (toward recovery) — always apply this beneficial direction
          const deficit = cfg.ttlLo - currentTTL;
          ror -= cfg.steerK * deficit;
        }
      }

      // 3. Apply ramped mitigation — reads live timestamps from refs
      const { effectiveRoR } = computeMitigatedRoR(ror, {
        feedTs:    feedTsRef.current,
        h2Ts:      h2TsRef.current,
        coolingTs: coolingTsRef.current,
      });
      ror = effectiveRoR;

      // 4. Hard-clamp RoR
      const anyMitig = feedTsRef.current !== null || h2TsRef.current !== null || coolingTsRef.current !== null;
      // During full recovery, allow RoR to drop below band min (don't fight it)
      const rorFloor = anyMitig ? 0.03 : cfg.rorMin;
      const rorCeil  = allFullMitigation ? cfg.rorMax : cfg.rorMax;
      ror = Math.max(rorFloor, Math.min(rorCeil, ror));

      // 4b. Full-mitigation thermal recovery assist
      // Pulls temperature down each tick — makes TTL climb across all bands toward NORMAL
      // Rate tuned so ~10 ticks (10 s) moves ~0.6°C → ~5+ min TTL gain at SEVERE RoR
      const TTL_RECOVERY_CAP = 58; // minutes — NORMAL ceiling
      const currentRawTTL = getSimTTL(temp, ror, limits);
      if (allFullMitigation && currentRawTTL < TTL_RECOVERY_CAP) {
        // 0.06°C/tick thermal pullback — enough to outpace even SEVERE RoR drift
        temp -= 0.06;
      }

      // 5. Advance temperature
      const tempNoise = (Math.random() - 0.5) * 0.04;
      temp = temp + ror * DT + tempNoise * DT;

      // Write back to refs
      simTempRef.current = temp;
      simRoRRef.current  = ror;

      // Compute new raw TTL
      const rawTTL = getSimTTL(temp, ror, limits);

      // Smooth: cap gain to +0.8 min/sec (anti-teleport), allow drops freely
      setSmoothedTTL(prev => {
        if (prev === null) return rawTTL;
        const delta = rawTTL - prev;
        const capped = prev + Math.max(-3, Math.min(0.8, delta));
        return Math.max(0, capped);
      });

      setSimTemp(temp);
      setSimRoR(ror);
    }, 1000);

    return () => clearInterval(tick);
  }, [simRunning, displayMode, state.limits]);

  // ── Mitigation toggle handler ─────────────────────────────────────────────
  // Each lever stores a start timestamp. Effect ramps from 0 → max after delay.
  const handleMitigate = (action) => {
    if (action === "feedReduction") {
      const next = !feedReductionActive;
      feedTsRef.current = next ? Date.now() : null;
      setFeedReductionActive(next);
      setMitigationMsg(next
        ? "Feed reduction active — effect builds over ~7 s (max −25% RoR)"
        : "Feed reduction deactivated");
    } else if (action === "quench") {
      const next = !quenchBoostActive;
      h2TsRef.current = next ? Date.now() : null;
      setQuenchBoostActive(next);
      setMitigationMsg(next
        ? "Hydrogen quench active — effect builds over ~9 s (max −20% RoR)"
        : "Hydrogen quench deactivated");
    } else if (action === "cooling") {
      const next = !coolingBoostActive;
      coolingTsRef.current = next ? Date.now() : null;
      setCoolingBoostActive(next);
      setMitigationMsg(next
        ? "Cooling boost active — ramps to −30% RoR over ~14 s"
        : "Cooling boost deactivated");
    }
    setTimeout(() => setMitigationMsg(""), 6000);
  };

  // ── Scenario seeds: initial (temp, ror) chosen so TTL starts mid-band ───────
  // limit = 370; TTL_target = mid-band; temp = limit - ror * TTL_target
  // NORMAL:         ror=0.25, TTL≈48 → temp = 370 - 0.25*48 = 358.0
  // EARLY_DRIFT:    ror=0.45, TTL≈22 → temp = 370 - 0.45*22 = 360.1
  // SEVERE_DRIFT:   ror=0.85, TTL≈7.5→ temp = 370 - 0.85*7.5 = 363.6
  // IMMEDIATE_RISK: ror=1.50, TTL≈2.6→ temp = 370 - 1.50*2.6 = 366.1
  const SCENARIO_SEEDS = {
    NORMAL:         { temp: 358.0, ror: 0.25, limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" } },
    EARLY_DRIFT:    { temp: 360.1, ror: 0.45, limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" } },
    SEVERE_DRIFT:   { temp: 363.6, ror: 0.85, limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" } },
    IMMEDIATE_RISK: { temp: 366.1, ror: 1.50, limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" } },
  };
  const handleSelectScenario = (scenario) => {
    const seed = SCENARIO_SEEDS[scenario] || SCENARIO_SEEDS.NORMAL;
    simTempRef.current = seed.temp;
    simRoRRef.current  = seed.ror;
    simRoRRef._scenarioBand = scenario;
    setSimTemp(seed.temp);
    setSimRoR(seed.ror);
    setSmoothedTTL(null);
    // Reset all mitigation levers on scenario change
    feedTsRef.current    = null;
    h2TsRef.current      = null;
    coolingTsRef.current = null;
    setFeedReductionActive(false);
    setQuenchBoostActive(false);
    setCoolingBoostActive(false);
    setMitigationMsg("");
    const s = DEMO_SCENARIOS[scenario];
    if (s) {
      setState(prev => ({ ...prev, equipment: s.equipment, feedFlow: s.feedFlow, sensorQuality: s.sensorQuality, opMode: s.opMode, demoScenario: scenario, limits: seed.limits }));
    }
    setSimRunning(true);
    setMitigationMsg("");
  };

  // Auto-cycle logic
  useEffect(() => {
    if (autoCycling && displayMode === "presentation") {
      cycleRef.current = setInterval(() => {
        setPresScenario(prev => (prev + 1) % SCENARIOS.length);
        setSequenceStage(0);
      }, 5000);
    }
    return () => {
      if (cycleRef.current) clearInterval(cycleRef.current);
    };
  }, [autoCycling, displayMode]);

  // Four-stage escalation sequence logic
  // Timing: Stable→Early: 4500ms pause, Early→Severe: 5000ms pause, Severe: manual only
  const SEQUENCE_STAGE_DURATIONS = [4500, 3000, 5000, null]; // null = hold indefinitely

  useEffect(() => {
    const currentScenario = SCENARIOS[presScenario];
    if (displayMode === "presentation" && currentScenario?.isSequence && !autoCycling && !demonstrationActive) {
      const duration = SEQUENCE_STAGE_DURATIONS[sequenceStage];
      if (duration === null) return; // Severe — manual advance only
      sequenceRef.current = setTimeout(() => {
        setSequenceStage(prev => {
          const nextStage = prev + 1;
          if (nextStage >= currentScenario.stages.length) return 0;
          return nextStage;
        });
      }, duration);
    }
    return () => {
      if (sequenceRef.current) clearTimeout(sequenceRef.current);
    };
  }, [presScenario, sequenceStage, displayMode, autoCycling, demonstrationActive]);

  // Operational demonstration logic
  useEffect(() => {
    if (displayMode === "presentation" && demonstrationActive) {
      demoRef.current = setInterval(() => {
        setDemonstrationStage(prev => {
          const nextStage = prev + 1;
          if (nextStage >= DEMONSTRATION_STAGES.length) {
            setDemonstrationActive(false);
            return 0;
          }
          return nextStage;
        });
      }, 7000);
    }
    return () => {
      if (demoRef.current) clearInterval(demoRef.current);
    };
  }, [demonstrationActive, displayMode]);

  // Determine active data source
  const activeData = displayMode === "presentation"
    ? (() => {
        // Demonstration mode takes priority
        if (demonstrationActive) {
          const stage = DEMONSTRATION_STAGES[demonstrationStage];
          return {
            ...DEFAULTS,
            samples: stage.samples,
            limits: normalizeLimits(stage.limits, DEFAULTS.limits),
            equipment: stage.equipment,
            feedFlow: stage.feedFlow,
            sensorQuality: stage.sensorQuality,
            opMode: stage.opMode,
          };
        }
        
        const scenario = SCENARIOS[presScenario];
        if (!scenario) {
          console.warn(`[Manarah] Scenario at index ${presScenario} is undefined — falling back to defaults.`);
          return { ...DEFAULTS };
        }
        if (scenario.isSequence && scenario.stages) {
          const stage = scenario.stages[sequenceStage] || scenario.stages[0];
          return {
            ...DEFAULTS,
            samples: stage.samples,
            limits: normalizeLimits(stage.limits ?? scenario.limits, DEFAULTS.limits),
            equipment: stage.equipment || scenario.equipment || DEFAULTS.equipment,
            feedFlow: stage.feedFlow || scenario.feedFlow || DEFAULTS.feedFlow,
            sensorQuality: stage.sensorQuality || scenario.sensorQuality || DEFAULTS.sensorQuality,
            opMode: stage.opMode || scenario.opMode || DEFAULTS.opMode,
          };
        }
        return {
          ...DEFAULTS,
          samples: scenario.samples,
          limits: normalizeLimits(scenario.limits, DEFAULTS.limits),
          equipment: scenario.equipment,
          feedFlow: scenario.feedFlow,
          sensorQuality: scenario.sensorQuality,
          opMode: scenario.opMode,
        };
      })()
    : state;

  // ── Determine active temperature and RoR depending on mode ──────────────────
  // Interactive: use live physics sim; Presentation: use scenario sample data.
  const isInteractive = displayMode === "interactive";

  // When preheat is active, override temperature with warm-up values.
  // Escalation logic is suppressed (preheat state maps to NORMAL band).
  const isPreheatRunning = isInteractive && preheatActive && !preheatComplete;
  const isPreheatDone    = isInteractive && preheatActive && preheatComplete;

  const currentValue  = isPreheatRunning
    ? preheatTemps.rit
    : (isInteractive ? simTemp : activeData.samples[activeData.samples.length - 1]);
  const effectiveSlope = isPreheatRunning
    ? 0.05  // near-zero slope so TTL stays at Infinity → NORMAL band
    : (isInteractive ? simRoR : computeRateOfRise(activeData.samples, activeData.interval));

  // ── Compute TTL (single source of truth) ────────────────────────────────────
  // Interactive: use smoothed physics TTL | Presentation: derive from samples
  const highLimit = Number(activeData.limits?.hi || 370);
  const rawPhysicsTTL = getSimTTL(currentValue, effectiveSlope, activeData.limits);
  const physicsTTL   = smoothedTTL !== null ? smoothedTTL : rawPhysicsTTL;

  const constraints = computeAllConstraints(currentValue, activeData.limits, effectiveSlope);
  const nearest     = getNearestConstraint(constraints);

  // timeToNearest is THE single source for all state derivation
  const timeToNearest = isInteractive ? physicsTTL : (nearest ? nearest.time : Infinity);

  // ── Ancillary calculations (all derived, never override timeToNearest) ───────
  const beds = simulateBedTemperatures(currentValue, effectiveSlope, activeData.equipment, 0);
  const bedImbalance    = computeBedImbalance(beds);
  const coolingCapacity = computeCoolingCapacity(activeData.equipment, effectiveSlope, timeToNearest);
  const hotSpotRisk     = computeHotSpotRisk(bedImbalance, activeData.equipment, coolingCapacity, effectiveSlope);

  // ── Derive system state from live TTL ──────────────────────────────────────
  // derivedSystemState always follows the timer — used when demoActive is true
  // so the entire UI automatically tracks the countdown across band thresholds.
  const derivedSystemState = getBandFromTTL(timeToNearest);

  // When the interactive sim is running, auto-steer the scenario band to match
  // the derived state so steering stays in the right RoR range automatically.
  useEffect(() => {
    if (!isInteractive || !simRunning) return;
    const current = simRoRRef._scenarioBand || "NORMAL";
    if (current !== derivedSystemState) {
      simRoRRef._scenarioBand = derivedSystemState;
    }
  }, [derivedSystemState, isInteractive, simRunning]);

  // Get explicit uiState from scenario (if set)
  // In interactive mode, always follow the live timer — never lock to last click.
  const explicitUiState = isInteractive ? null : (activeData.demoScenario || null);

  // Preheat status - use demonstration stage preheat mode if active
  const ACTIVATION_LOWER = 280;
  const ACTIVATION_UPPER = 330;
  const activePreheatMode = demonstrationActive 
    ? DEMONSTRATION_STAGES[demonstrationStage]?.preheatActive 
    : preheatActive;
  
  let preheatStatus = null;
  if (activePreheatMode) {
    if (currentValue < ACTIVATION_LOWER) {
      preheatStatus = "Below activation window";
    } else if (currentValue >= ACTIVATION_LOWER && currentValue <= ACTIVATION_UPPER) {
      if (effectiveSlope > 1.5) {
        preheatStatus = "Thermal stress risk";
      } else if (effectiveSlope > 1.0) {
        preheatStatus = "Above recommended ramp";
      } else {
        preheatStatus = "Within envelope";
      }
    } else {
      preheatStatus = "Exiting safe window";
    }
  }
  
  const escalationLevel = adjustEscalationForHotSpot(
    getEscalationLevel(timeToNearest, activePreheatMode, effectiveSlope, coolingCapacity),
    hotSpotRisk,
    timeToNearest
  );
  // All state derived from timeToNearest — single source of truth
  // In interactive mode, systemState always == derivedSystemState (timer-driven).
  const computedState = getSystemState(timeToNearest);
  const systemState   = isInteractive ? derivedSystemState : (explicitUiState || computedState);
  const demoState     = isInteractive ? derivedSystemState : computedState;
  const alarmState    = getAlarmState(currentValue, activeData.limits);

  // displayTTL and displaySlope feed every consumer
  const displayTTL   = timeToNearest;
  const displaySlope = effectiveSlope;

  const consequence = nearest && nearest.time < Infinity
    ? `If unchanged: ${nearest.name} in ${formatTime(displayTTL)}`
    : null;

  // ── Ramp progress (0-100) for each active lever ──────────────────────────
  const getRampPct = (tsRef, action) => {
    if (tsRef.current === null) return 0;
    const { delaySec, rampSec } = ACTION_PARAMS[action];
    const elapsed = (Date.now() - tsRef.current) / 1000;
    if (elapsed < delaySec) return 0;
    return Math.min(100, ((elapsed - delaySec) / rampSec) * 100);
  };

  // Live ramp progress (re-read on every render — driven by tick state updates)
  const rampProgress = {
    feed:    getRampPct(feedTsRef,    'feed'),
    h2:      getRampPct(h2TsRef,      'h2'),
    cooling: getRampPct(coolingTsRef, 'cooling'),
  };

  // Minutes recovered = currentTTL − baselineTTL (no-mitigation TTL)
  const baselineTTL = isInteractive
    ? getSimTTL(currentValue, simRoRRef.current, activeData.limits)  // unmitigated
    : null;
  const mitigatedTTL = isInteractive ? displayTTL : null;
  const minutesRecovered = (baselineTTL !== null && mitigatedTTL !== null)
    ? Math.max(0, mitigatedTTL - baselineTTL)
    : 0;

  const handleRunDemo = useCallback((scenarioIndex) => {
    const s = SCENARIOS[scenarioIndex];
    setState({
      ...DEFAULTS,
      samples: [...s.samples],
      limits: { ...s.limits },
      equipment: { ...s.equipment },
      feedFlow: s.feedFlow,
      sensorQuality: s.sensorQuality,
      opMode: s.opMode,
    });
  }, []);

  const handleToggleAutoCycle = () => {
    setAutoCycling(prev => !prev);
  };

  const handleStartDemonstration = () => {
    setDemonstrationActive(true);
    setDemonstrationStage(0);
    setAutoCycling(false);
  };

  const handleStopDemonstration = () => {
    setDemonstrationActive(false);
    setDemonstrationStage(0);
  };

  const handleResetPresentation = useCallback(() => {
    setPresScenario(0);
    setSequenceStage(0);
    setAutoCycling(false);
    setDemonstrationActive(false);
    setDemonstrationStage(0);
    if (cycleRef.current) clearInterval(cycleRef.current);
    if (sequenceRef.current) clearTimeout(sequenceRef.current);
    if (demoRef.current) clearInterval(demoRef.current);
  }, []);

  const bgDimming = ""; // replaced by CSS var theme

  const [manarahOpen, setManarahOpen] = useState(false);

  // ── System awareness moment (Presentation mode: Stable → Early Drift) ───────
  // 0 = idle, 1 = "analyzing...", 2 = "constraint identified"
  const [awarenessPhase, setAwarenessPhase] = useState(0);
  const prevSystemStateRef = useRef(null);
  const awarenessUsedRef   = useRef(false); // fires only once per session

  const handleManarahAutoOpen = () => {
    setManarahOpen(true);
  };

  // ── System awareness moment trigger ─────────────────────────────────────────
  useEffect(() => {
    if (displayMode !== "presentation") return;
    const prev = prevSystemStateRef.current;
    const curr = systemState;
    prevSystemStateRef.current = curr;

    if (
      curr === "EARLY_DRIFT" &&
      prev === "NORMAL" &&
      !awarenessUsedRef.current
    ) {
      awarenessUsedRef.current = true;
      setAwarenessPhase(1); // "Analyzing..."
      const t1 = setTimeout(() => setAwarenessPhase(2), 1500); // → "Constraint identified"
      const t2 = setTimeout(() => setAwarenessPhase(0), 5000); // → clear
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [systemState, displayMode]);

  // Reset awareness flag when leaving presentation mode or resetting
  useEffect(() => {
    if (displayMode !== "presentation") {
      awarenessUsedRef.current = false;
      setAwarenessPhase(0);
      prevSystemStateRef.current = null;
    }
  }, [displayMode]);

  // ── ESC key closes Manarah panel (both modes) ───────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && manarahOpen) {
        setManarahOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [manarahOpen]);

  // ── Keyboard quick-switch (Interactive mode only) ────────────────────────────
  // 1 = NORMAL | 2 = EARLY_DRIFT | 3 = SEVERE_DRIFT | 4 = IMMEDIATE_RISK
  // Ignored when focus is inside an input/textarea/select (prevents interference).
  useEffect(() => {
    if (displayMode !== "interactive") return;
    const BAND_KEYS = {
      "1": "NORMAL",
      "2": "EARLY_DRIFT",
      "3": "SEVERE_DRIFT",
      "4": "IMMEDIATE_RISK",
    };
    const handler = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const band = BAND_KEYS[e.key];
      if (band) handleSelectScenario(band);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [displayMode]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
    <div className={`theme-${theme} min-h-screen transition-colors duration-300`}
      style={{ background: "var(--t-bg-page)", color: "var(--t-text-1)", transition: "background-color 300ms ease, color 300ms ease" }}>
      {!manarahOpen && (
        <ManarahButton systemState={systemState} onClick={() => setManarahOpen(true)} drawerOpen={false} docked={false} />
      )}
      <ManarahPanel
        open={manarahOpen}
        systemState={systemState}
        timeToNearest={displayTTL}
        slope={displaySlope}
        coolingCapacity={coolingCapacity}
        equipment={activeData.equipment}
        rampProgress={rampProgress}
        feedReductionActive={feedReductionActive}
        quenchBoostActive={quenchBoostActive}
        coolingBoostActive={coolingBoostActive}
        onAutoOpen={handleManarahAutoOpen}
        onClose={() => setManarahOpen(false)}
        beacon={manarahOpen ? (
          <ManarahButton systemState={systemState} onClick={() => setManarahOpen(false)} drawerOpen={true} docked={true} />
        ) : null}
        scenarioName={displayMode === "presentation" ? SCENARIOS[presScenario]?.name : undefined}
      />
      <GlobalHeader
        displayMode={displayMode}
        onModeChange={setDisplayMode}
        alarmsOnly={alarmsOnly}
        onAlarmsOnlyChange={setAlarmsOnly}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      <AlarmBanner
        alarmState={alarmState}
        escalationLevel={escalationLevel}
        alarmsOnly={alarmsOnly}
        hotSpotRisk={hotSpotRisk}
        timeToNearest={displayTTL}
        coolingCapacity={coolingCapacity}
        equipment={activeData.equipment}
        slope={displaySlope}
        preheatStatus={preheatStatus}
        uiState={explicitUiState}
        demoState={isInteractive ? demoState : undefined}
      />

      {!alarmsOnly && displayMode === "presentation" && (
        <div className="max-w-[2200px] mx-auto px-20 pt-4">
          <p className="text-sm transition-colors duration-300" style={{ color: "var(--t-text-3)" }}>
            Constraint escalation driven by sustained temperature acceleration; intervention window remains intact.
          </p>
        </div>
      )}

      <div className="max-w-[2200px] mx-auto px-20 py-10 space-y-10">
        {/* ALARMS-ONLY VIEW */}
        {alarmsOnly && (
          <AlarmsOnlyView
            currentValue={currentValue}
            limits={activeData.limits}
            units={activeData.units}
          />
        )}

        {/* INTERACTIVE MODE */}
        {!alarmsOnly && displayMode === "interactive" && (
          <>
            {/* Preheat mode status banner */}
            {(isPreheatRunning || isPreheatDone) && (
              <div style={{
              textAlign: "center",
              padding: "8px 0 4px",
              fontSize: "0.82rem",
              fontWeight: 500,
              letterSpacing: "0.06em",
              color: isPreheatDone ? "#4FB8B0" : "#C8AA50",
              opacity: theme === "light" ? 1 : 0.88,
              transition: "color 600ms ease",
              }}>
                {isPreheatDone
                  ? "Preheat Complete — Normal Operation"
                  : `Reactor Preheat Mode Active  ·  RIT ${Math.round(preheatTemps.rit)}°C`}
              </div>
            )}

            <QuickScenarioSelector
              activeScenario={derivedSystemState}
              onSelect={handleSelectScenario}
            />
            
            <HeroMetric
              timeToNearest={displayTTL}
              escalationLevel={escalationLevel}
              slope={displaySlope}
              uiState={systemState}
              demoTimeMin={displayTTL}
              demoState={demoState}
              isPreheatMode={isPreheatRunning}
              preheatRIT={preheatTemps.rit}
              preheatComplete={isPreheatDone}
            />
            
            <div className="max-w-3xl mx-auto space-y-3">
              <DecisionWindowBar 
                timeToNearest={displayTTL}
                escalationLevel={escalationLevel}
                coolingCapacity={coolingCapacity}
                equipment={activeData.equipment}
                hotSpotRisk={hotSpotRisk}
                slope={displaySlope}
                currentTemp={currentValue}
                demoTimeMin={displayTTL}
                demoState={demoState}
                isPreheatMode={isPreheatRunning}
              />
              
              <LeverContext 
                equipment={activeData.equipment}
                coolingCapacity={coolingCapacity}
                escalationLevel={escalationLevel}
                onMitigate={handleMitigate}
                mitigationMsg={mitigationMsg}
                feedReductionActive={feedReductionActive}
                quenchBoostActive={quenchBoostActive}
                coolingBoostActive={coolingBoostActive}
                rampProgress={rampProgress}
                minutesRecovered={minutesRecovered}
              />
              
              <div className="text-center pt-2 border-t transition-colors duration-300" style={{ borderColor: "var(--t-border)" }}>
                <p className="text-xs transition-colors duration-300" style={{ color: "var(--t-text-4)" }}>
                  Advisory system — no control actions executed. Operator retains full control at all times.
                </p>
              </div>
            </div>

            <div className="max-w-3xl mx-auto">
              <OpsCapacityPanel
                systemState={systemState}
                coolingCapacity={coolingCapacity}
                equipment={activeData.equipment}
                slope={displaySlope}
                isPreheatMode={isPreheatRunning}
              />
            </div>

            <ProcessMap
              escalationLevel={escalationLevel}
              slope={displaySlope}
              currentTemp={currentValue}
              feedFlow={activeData.feedFlow}
              equipment={activeData.equipment}
              preheatActive={preheatActive}
              preheatStatus={preheatStatus}
              coolingCapacity={coolingCapacity}
              nearest={nearest}
              timeToNearest={displayTTL}
              sensorQuality={activeData.sensorQuality}
              opMode={activeData.opMode}
              bedImbalance={bedImbalance}
              hotSpotRisk={hotSpotRisk}
              interactive={true}
              units={activeData.units}
              systemState={systemState}
              preheatOverride={isPreheatRunning ? preheatTemps : null}
            />

            <InputPanel
              state={state}
              onChange={setState}
              onRunDemo={handleRunDemo}
              preheatActive={preheatActive}
              onPreheatToggle={setPreheatActive}
            />

            <ReasoningBlocks
              slope={displaySlope}
              nearest={nearest}
              constraints={constraints}
              equipment={activeData.equipment}
              sensorQuality={activeData.sensorQuality}
              units={activeData.units}
              systemState={systemState}
              timeToNearest={displayTTL}
              isPreheatMode={isPreheatRunning}
              preheatRIT={preheatTemps.rit}
            />

            <div className="max-w-3xl mx-auto space-y-0">
              <ExecutiveRibbon
                timeToNearest={displayTTL}
                equipment={activeData.equipment}
                sensorQuality={activeData.sensorQuality}
                isPreheatMode={isPreheatRunning}
              />
              <AcknowledgeSystem />
            </div>
          </>
        )}

        {/* PRESENTATION MODE */}
        {!alarmsOnly && displayMode === "presentation" && (
          <>
            <ScenarioAnnouncer label={SCENARIOS[presScenario]?.name?.replace(/^\d+\.\s*/, "")} />
            {/* Status block — isolated, 40px vertical breathing room */}
            <div style={{ paddingTop: 40, paddingBottom: 40 }}>
              <PresentationHero
                timeToNearest={displayTTL}
                nearestName={nearest?.name}
                escalationLevel={escalationLevel}
                slope={displaySlope}
                equipment={activeData.equipment}
                preheatActive={activePreheatMode}
                preheatStatus={preheatStatus}
                coolingCapacity={coolingCapacity}
                sensorQuality={activeData.sensorQuality}
                opMode={activeData.opMode}
                bedImbalance={bedImbalance}
                hotSpotRisk={hotSpotRisk}
                scenarioName={SCENARIOS[presScenario]?.name}
                awarenessPhase={awarenessPhase}
                businessImpact={SCENARIOS[presScenario]?.businessImpact}
              />
            </div>

            {/* Fixed bottom presenter strip */}
            <PresenterControls
              presScenario={presScenario}
              onSelectScenario={(idx) => { setPresScenario(idx); setSequenceStage(0); }}
              onReset={handleResetPresentation}
            />

            <OpsCapacityPanel
              systemState={systemState}
              coolingCapacity={coolingCapacity}
              equipment={activeData.equipment}
              slope={displaySlope}
            />

            <div style={{ position: "relative", opacity: 0.72, transition: "opacity 0.4s ease", pointerEvents: "none" }}>
              <ProcessMap
                escalationLevel={escalationLevel}
                slope={displaySlope}
                currentTemp={currentValue}
                feedFlow={activeData.feedFlow}
                equipment={activeData.equipment}
                preheatActive={activePreheatMode}
                preheatStatus={preheatStatus}
                coolingCapacity={coolingCapacity}
                nearest={nearest}
                timeToNearest={displayTTL}
                sensorQuality={activeData.sensorQuality}
                opMode={activeData.opMode}
                bedImbalance={bedImbalance}
                hotSpotRisk={hotSpotRisk}
                interactive={false}
                units={activeData.units}
                systemState={systemState}
                awarenessPhase={awarenessPhase}
              />
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.08)", pointerEvents: "none" }} />
            </div>
          </>
        )}
      </div>
    </div>
    </ThemeContext.Provider>
  );
}