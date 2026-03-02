import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { initInteractiveState, stepInteractiveState } from "@/components/refinery/interactiveEngine";
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
  computeMultiVarTTL,
  getDominantDriver,
  SCENARIOS,
  DEMONSTRATION_STAGES,
  HOT_SPOT_SCENARIO,
} from "@/components/refinery/calcEngine";
import {
  getLeverEffect,
  ACTION_PARAMS,
} from "@/components/refinery/mitigationEngine";
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
  const [displayMode, setDisplayMode] = useState("interactive");
  const [alarmsOnly, setAlarmsOnly] = useState(false);
  const [state, setState] = useState({ ...DEFAULTS });
  const [preheatActive, setPreheatActive] = useState(false);

  // ── Interactive engine state ──────────────────────────────────────────────
  const [simRunning, setSimRunning] = useState(true);
  const [mitigationMsg, setMitigationMsg] = useState("");

  // Mitigation toggle state (UI)
  const [feedReductionActive, setFeedReductionActive] = useState(false);
  const [quenchBoostActive,   setQuenchBoostActive]   = useState(false);
  const [coolingBoostActive,  setCoolingBoostActive]  = useState(false);
  // Activation timestamps for rampProgress UI only
  const feedTsRef    = useRef(null);
  const h2TsRef      = useRef(null);
  const coolingTsRef = useRef(null);

  // Which drift mode is selected — drives desiredRoR in engine
  const driftModeRef = useRef("NORMAL");

  // Engine state ref — single source of truth inside tick closure
  const engineStateRef = useRef(initInteractiveState(DEFAULTS.limits));
  // Reactive state for rendering
  const [engineState, setEngineState] = useState(engineStateRef.current);

  // ── Derive named state from TTL ───────────────────────────────────────────
  const getBandFromTTL = (ttlMin) => {
    if (ttlMin <= 4)  return "IMMEDIATE_RISK";
    if (ttlMin <= 10) return "SEVERE_DRIFT";
    if (ttlMin <= 35) return "EARLY_DRIFT";
    return "NORMAL";
  };

  // ── Safe scenario index helper ────────────────────────────────────────────
  const safeScenarioIndex = (index, len) => {
    if (!len || len <= 0) return 0;
    return Math.max(0, Math.min(index, len - 1));
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

  // ── Interactive engine tick ───────────────────────────────────────────────
  useEffect(() => {
    if (!simRunning || displayMode !== "interactive") return;
    let lastTs = Date.now();

    const tick = setInterval(() => {
      const now   = Date.now();
      const dtMs  = now - lastTs;
      lastTs = now;

      const next = stepInteractiveState(
        engineStateRef.current,
        {
          driftMode: driftModeRef.current,
          limits:    state.limits,
          actions: {
            feedReduction: feedTsRef.current !== null,
            quenchBoost:   h2TsRef.current   !== null,
            coolingBoost:  coolingTsRef.current !== null,
          },
        },
        dtMs
      );

      engineStateRef.current = next;
      setEngineState({ ...next });
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

  // ── Scenario seeds: pre-warm engine to mid-band so operator sees correct state ──
  // limit=370; temp = limit - desiredRoR * midBandTTL
  const SCENARIO_SEEDS = {
    NORMAL:         { temp: 352.0, ror: 0.18 },
    EARLY_DRIFT:    { temp: 360.8, ror: 0.42 },
    SEVERE_DRIFT:   { temp: 363.4, ror: 0.95 },
    IMMEDIATE_RISK: { temp: 367.1, ror: 1.45 },
  };

  const SCENARIO_LIMITS = { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" };

  const handleSelectScenario = (scenario) => {
    const seed = SCENARIO_SEEDS[scenario] || SCENARIO_SEEDS.NORMAL;
    driftModeRef.current = scenario;

    // Seed the engine at the correct mid-band position
    const seedState = initInteractiveState(SCENARIO_LIMITS);
    seedState.tempReactorOutC = seed.temp;
    seedState.rorCpm          = seed.ror;
    seedState.actionEffects   = { feed: 0, quench: 0, cooling: 0 };
    // Recompute TTL from seed
    const { finalTTL } = computeMultiVarTTL(seed.temp, SCENARIO_LIMITS, seed.ror);
    seedState.ttlMin      = finalTTL;
    seedState.ttlShownMin = finalTTL;
    seedState.systemState = getSystemState(finalTTL);

    engineStateRef.current = seedState;
    setEngineState({ ...seedState });

    // Reset lever timestamps (UI)
    feedTsRef.current    = null;
    h2TsRef.current      = null;
    coolingTsRef.current = null;
    setFeedReductionActive(false);
    setQuenchBoostActive(false);
    setCoolingBoostActive(false);
    setMitigationMsg("");

    import("@/components/refinery/calcEngine").then(({ DEMO_SCENARIOS }) => {
      const s = DEMO_SCENARIOS[scenario];
      if (s) {
        setState(prev => ({ ...prev, equipment: s.equipment, feedFlow: s.feedFlow, sensorQuality: s.sensorQuality, opMode: s.opMode, demoScenario: scenario, limits: SCENARIO_LIMITS }));
      }
    });
    setSimRunning(true);
  };

  // Auto-cycle logic
  useEffect(() => {
    if (autoCycling && displayMode === "presentation") {
      cycleRef.current = setInterval(() => {
        setPresScenario(prev => safeScenarioIndex((prev + 1) % Math.max(1, SCENARIOS.length), SCENARIOS.length));
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
    const safeIdx = safeScenarioIndex(presScenario, SCENARIOS.length);
    const currentScenario = SCENARIOS[safeIdx];
    if (displayMode === "presentation" && currentScenario?.isSequence && !autoCycling && !demonstrationActive) {
      const duration = SEQUENCE_STAGE_DURATIONS[sequenceStage];
      if (duration === null) return; // Severe — manual advance only
      sequenceRef.current = setTimeout(() => {
        setSequenceStage(prev => {
          const nextStage = prev + 1;
          if (nextStage >= (currentScenario.stages?.length ?? 1)) return 0;
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

        const safeIdx = safeScenarioIndex(presScenario, SCENARIOS.length);
        const scenario = SCENARIOS[safeIdx];
        if (!scenario) {
          console.warn(`[Manarah] Scenario at index ${safeIdx} is undefined — falling back to stable baseline.`);
          return { ...DEFAULTS };
        }
        if (scenario.isSequence && scenario.stages) {
          const stage = scenario.stages[safeScenarioIndex(sequenceStage, scenario.stages.length)] || scenario.stages[0];
          return {
            ...DEFAULTS,
            samples: stage.samples,
            limits: normalizeLimits(stage.limits ?? scenario.limits ?? DEFAULTS.limits, DEFAULTS.limits),
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

  const currentValue  = isInteractive ? simTemp   : activeData.samples[activeData.samples.length - 1];
  const rawSlope = isInteractive ? simRoR : computeRateOfRise(activeData.samples, activeData.interval);
  // No drift-stress multiplier — RoR from physics sim is already the effective slope
  const effectiveSlope = rawSlope;

  // ── Guard: ensure limits are always defined before constraint calculations ───
  const safeLimits = normalizeLimits(activeData.limits, DEFAULTS.limits);

  // ── Compute TTL (single source of truth — multi-variable: reactor + cooler) ──
  // Interactive: use smoothed physics TTL | Presentation: derive from samples
  // Both use computeMultiVarTTL to ensure min(TTL_reactor, TTL_cooler) drives escalation.
  const rawMultiVar   = computeMultiVarTTL(currentValue, safeLimits, effectiveSlope);
  const { finalTTL: rawPhysicsTTL, ttlReactor, ttlCooler } = rawMultiVar;
  const physicsTTL    = smoothedTTL !== null ? smoothedTTL : rawPhysicsTTL;

  const constraints = computeAllConstraints(currentValue, safeLimits, effectiveSlope);
  const nearest     = getNearestConstraint(constraints);

  // timeToNearest is THE single source for all state derivation
  const timeToNearest = isInteractive ? physicsTTL : rawPhysicsTTL;

  // ── Dominant driver — derived from TTL breakdown ─────────────────────────────
  const { driver: dominantDriver, driverLine: dominantDriverLine } = getDominantDriver({
    ttlReactor,
    ttlCooler,
    finalTTL: timeToNearest,
    slopeCpm: effectiveSlope,
    equipment: activeData.equipment,
    sensorQuality: activeData.sensorQuality,
  });

  // ── Ancillary calculations (all derived, never override timeToNearest) ───────
  const beds = simulateBedTemperatures(currentValue, effectiveSlope, activeData.equipment, 0);
  const bedImbalance    = computeBedImbalance(beds);
  const coolingCapacity = computeCoolingCapacity(activeData.equipment, effectiveSlope, timeToNearest);
  const hotSpotRisk     = computeHotSpotRisk(bedImbalance, activeData.equipment, coolingCapacity, effectiveSlope);

  // ── Derive system state from live TTL ──────────────────────────────────────
  // Both modes: pure TTL-driven, stateless. getSystemState(TTL) is single source of truth.
  const derivedSystemState = getBandFromTTL(timeToNearest);

  // Auto-update scenario band as TTL crosses thresholds — this is what drives staged progression
  useEffect(() => {
    if (!isInteractive || !simRunning) return;
    if (scenarioBandRef.current !== derivedSystemState) {
      scenarioBandRef.current = derivedSystemState;
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
  const systemState   = explicitUiState || computedState;
  const demoState     = computedState;
  const alarmState    = getAlarmState(currentValue, safeLimits);

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

  // Minutes recovered = currentTTL − baselineTTL (no-mitigation TTL, multi-var)
  const baselineTTL = isInteractive
    ? computeMultiVarTTL(currentValue, safeLimits, simRoRRef.current).finalTTL  // unmitigated
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
    if (cycleRef.current)    clearInterval(cycleRef.current);
    if (sequenceRef.current) clearTimeout(sequenceRef.current);
    if (demoRef.current)     clearInterval(demoRef.current);
    setPresScenario(0);
    setSequenceStage(0);
    setAutoCycling(false);
    setDemonstrationActive(false);
    setDemonstrationStage(0);
    setSmoothedTTL(null);
  }, []);

  // ── Keyboard navigation — Presentation Mode only ─────────────────────────────
  useEffect(() => {
    if (displayMode !== "presentation") return;
    const ARROW_KEYS = new Set(["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"]);
    const onKeyDown = (e) => {
      if (!ARROW_KEYS.has(e.key)) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable) return;
      e.preventDefault();
      const total = SCENARIOS.length;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setPresScenario(prev => safeScenarioIndex(prev + 1 >= total ? total - 1 : prev + 1, total));
        setSequenceStage(0);
      } else {
        setPresScenario(prev => safeScenarioIndex(prev - 1 < 0 ? 0 : prev - 1, total));
        setSequenceStage(0);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [displayMode]);

  const bgDimming = escalationLevel >= 2 ? "bg-[#0b1220]" : escalationLevel >= 1 ? "bg-[#0b1324]" : "bg-[#0b1220]";

  const [manarahOpen, setManarahOpen] = useState(false);

  const handleManarahAutoOpen = () => {
    setManarahOpen(true);
  };

  return (
    <div className={`min-h-screen text-white transition-colors duration-700 ${bgDimming}`}>
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
        dominantDriver={dominantDriver}
        dominantDriverLine={dominantDriverLine}
        onAutoOpen={handleManarahAutoOpen}
        onClose={() => setManarahOpen(false)}
        beacon={manarahOpen ? (
          <ManarahButton systemState={systemState} onClick={() => setManarahOpen(false)} drawerOpen={true} docked={true} />
        ) : null}
      />
      <GlobalHeader
        displayMode={displayMode}
        onModeChange={setDisplayMode}
        alarmsOnly={alarmsOnly}
        onAlarmsOnlyChange={setAlarmsOnly}
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
          <p className="text-[#999] text-sm">
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
              
              <div className="text-center pt-2 border-t border-[#2a2a2a]">
                <p className="text-[#555] text-xs">
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
            />

            <div className="max-w-3xl mx-auto space-y-0">
              <ExecutiveRibbon
                timeToNearest={displayTTL}
                equipment={activeData.equipment}
                sensorQuality={activeData.sensorQuality}
              />
              <AcknowledgeSystem />
            </div>
          </>
        )}

        {/* PRESENTATION MODE */}
        {!alarmsOnly && displayMode === "presentation" && (
          <>
            <ScenarioAnnouncer label={SCENARIOS[safeScenarioIndex(presScenario, SCENARIOS.length)]?.name?.replace(/^\d+\.\s*/, "")} />
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
              />
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.08)", pointerEvents: "none" }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}