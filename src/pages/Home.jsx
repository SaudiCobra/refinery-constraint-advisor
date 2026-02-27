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
import DecisionWindowBar from "@/components/refinery/DecisionWindowBar";
import LeverContext from "@/components/refinery/LeverContext";
import ProcessMap from "@/components/refinery/ProcessMap";
import PreheatIndicator from "@/components/refinery/PreheatIndicator";
import CoolingCapacityIndicator from "@/components/refinery/CoolingCapacityIndicator";
import H2AvailabilityIndicator from "@/components/refinery/H2AvailabilityIndicator";
import MitigationCapacity from "@/components/refinery/MitigationCapacity";
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
  SCENARIOS,
  DEMONSTRATION_STAGES,
  HOT_SPOT_SCENARIO,
} from "@/components/refinery/calcEngine";
import {
  computeMitigatedRoR,
  computeMitigatedTimeToLimit,
  smoothTransition,
  clampTimeToBaseline,
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
  // Mirror to refs so the tick can read them without stale closure
  const feedReductionRef = useRef(false);
  const quenchBoostRef   = useRef(false);
  const coolingBoostRef  = useRef(false);

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

      // 1. Random RoR wander (within band clamps)
      const rorNoise = (Math.random() - 0.5) * 2 * cfg.noise;
      ror = ror + rorNoise;

      // 2. Soft band-steering: proportional nudge if TTL out of [ttlLo, ttlHi]
      if (currentTTL > cfg.ttlHi) {
        // Too much time left → accelerate slightly to drift back into band
        const excess = currentTTL - cfg.ttlHi;
        ror += cfg.steerK * excess;
      } else if (currentTTL < cfg.ttlLo) {
        // Too little time → decelerate slightly to recover band
        const deficit = cfg.ttlLo - currentTTL;
        ror -= cfg.steerK * deficit;
      }

      // 3. Apply active mitigation factors (multiplicative, read from refs)
      let mitigFactor = 1.0;
      if (feedReductionRef.current) mitigFactor *= 0.80;
      if (quenchBoostRef.current)   mitigFactor *= 0.75;
      if (coolingBoostRef.current)  mitigFactor *= 0.85;
      ror = ror * mitigFactor;

      // 4. Hard-clamp RoR — use a floor of 0.05 when mitigation is active,
      //    otherwise respect band minimum so steering stays meaningful.
      const rorFloor = (mitigFactor < 1.0) ? 0.05 : cfg.rorMin;
      ror = Math.max(rorFloor, Math.min(cfg.rorMax, ror));

      // 5. Advance temperature
      const tempNoise = (Math.random() - 0.5) * 0.04;
      temp = temp + ror * DT + tempNoise * DT;

      // Write back to refs
      simTempRef.current = temp;
      simRoRRef.current  = ror;

      // Compute new raw TTL
      const rawTTL = getSimTTL(temp, ror, limits);

      // Smooth: cap jump to 2 min per tick to prevent display lurching
      setSmoothedTTL(prev => {
        if (prev === null) return rawTTL;
        const delta = rawTTL - prev;
        const capped = prev + Math.max(-2, Math.min(2, delta));
        return Math.max(0, capped);
      });

      setSimTemp(temp);
      setSimRoR(ror);
    }, 1000);

    return () => clearInterval(tick);
  }, [simRunning, displayMode, state.limits]);

  // ── Mitigation toggle handler ────────────────────────────────────────────
  // Each mitigation is a persistent toggle. When active, the tick applies a
  // multiplicative RoR reduction factor every second, so the timer grows within
  // 1–2 ticks. Stacking is multiplicative; minimum RoR floor = 0.05.
  //   feedReduction: ×0.80 (−20%)
  //   quenchBoost:   ×0.75 (−25%)
  //   coolingBoost:  ×0.85 (−15%)
  const handleMitigate = (action) => {
    if (action === "feedReduction") {
      const next = !feedReductionRef.current;
      feedReductionRef.current = next;
      setFeedReductionActive(next);
      setMitigationMsg(next ? "Feed reduction active — RoR reduced 20%" : "Feed reduction deactivated");
    } else if (action === "quench") {
      const next = !quenchBoostRef.current;
      quenchBoostRef.current = next;
      setQuenchBoostActive(next);
      setMitigationMsg(next ? "Quench boost active — RoR reduced 25%" : "Quench boost deactivated");
    } else if (action === "cooling") {
      const next = !coolingBoostRef.current;
      coolingBoostRef.current = next;
      setCoolingBoostActive(next);
      setMitigationMsg(next ? "Cooling boost active — RoR reduced 15%" : "Cooling boost deactivated");
    }
    setTimeout(() => setMitigationMsg(""), 4000);
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
    // Tag the ref so the tick knows which band config to use for steering
    simRoRRef._scenarioBand = scenario;
    setSimTemp(seed.temp);
    setSimRoR(seed.ror);
    setSmoothedTTL(null); // reset smoother — snap to new value immediately
    import("@/components/refinery/calcEngine").then(({ DEMO_SCENARIOS }) => {
      const s = DEMO_SCENARIOS[scenario];
      if (s) {
        setState(prev => ({ ...prev, equipment: s.equipment, feedFlow: s.feedFlow, sensorQuality: s.sensorQuality, opMode: s.opMode, demoScenario: scenario, limits: seed.limits }));
      }
    });
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
  useEffect(() => {
    const currentScenario = SCENARIOS[presScenario];
    if (displayMode === "presentation" && currentScenario?.isSequence && !autoCycling && !demonstrationActive) {
      sequenceRef.current = setInterval(() => {
        setSequenceStage(prev => {
          const nextStage = prev + 1;
          if (nextStage >= currentScenario.stages.length) {
            return 0;
          }
          return nextStage;
        });
      }, 8000);
    }
    return () => {
      if (sequenceRef.current) clearInterval(sequenceRef.current);
    };
  }, [presScenario, displayMode, autoCycling, demonstrationActive]);

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
            limits: stage.limits,
            equipment: stage.equipment,
            feedFlow: stage.feedFlow,
            sensorQuality: stage.sensorQuality,
            opMode: stage.opMode,
          };
        }
        
        const scenario = SCENARIOS[presScenario];
        if (scenario.isSequence && scenario.stages) {
          const stage = scenario.stages[sequenceStage] || scenario.stages[0];
          return {
            ...DEFAULTS,
            samples: stage.samples,
            limits: scenario.limits,
            equipment: stage.equipment,
            feedFlow: scenario.feedFlow,
            sensorQuality: scenario.sensorQuality,
            opMode: scenario.opMode,
          };
        }
        return {
          ...DEFAULTS,
          samples: scenario.samples,
          limits: scenario.limits,
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
  const effectiveSlope = isInteractive ? simRoR   : computeRateOfRise(activeData.samples, activeData.interval);

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

  const bgDimming = escalationLevel >= 2 ? "bg-[#0b1220]" : escalationLevel >= 1 ? "bg-[#0b1324]" : "bg-[#0b1220]";

  return (
    <div className={`min-h-screen text-white transition-colors duration-700 ${bgDimming}`}>
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
            Escalation driven by sustained temperature rise; intervention window remains available.
          </p>
        </div>
      )}

      <div className="max-w-[2200px] mx-auto px-20 py-10 space-y-10">
        {/* ALARMS-ONLY VIEW */}
        {alarmsOnly && (
          <AlarmsOnlyView
            currentValue={currentValue}
            alarmState={alarmState}
            limits={activeData.limits}
            units={activeData.units}
          />
        )}

        {/* INTERACTIVE MODE */}
        {!alarmsOnly && displayMode === "interactive" && (
          <>
            <QuickScenarioSelector
              activeScenario={computedState}
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
              />
              
              <div className="text-center pt-2 border-t border-[#2a2a2a]">
                <p className="text-[#555] text-xs">
                  Advisory system — no control actions executed. Operator retains full control at all times.
                </p>
              </div>
            </div>

            <PreheatIndicator
              preheatActive={preheatActive}
              onToggle={setPreheatActive}
              currentTemp={currentValue}
              slope={displaySlope}
            />

            <MitigationCapacity 
              systemState={systemState}
            />

            <CoolingCapacityIndicator capacity={coolingCapacity} />

            <H2AvailabilityIndicator 
              equipment={activeData.equipment} 
              coolingCapacity={coolingCapacity}
              slope={displaySlope}
            />

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
            />

            <ReasoningBlocks
              slope={displaySlope}
              nearest={nearest}
              constraints={constraints}
              equipment={activeData.equipment}
              sensorQuality={activeData.sensorQuality}
              units={activeData.units}
            />

            <AcknowledgeSystem />

            <ExecutiveRibbon
              timeToNearest={displayTTL}
              equipment={activeData.equipment}
              sensorQuality={activeData.sensorQuality}
            />
          </>
        )}

        {/* PRESENTATION MODE */}
        {!alarmsOnly && displayMode === "presentation" && (
          <>
            {!demonstrationActive && (
              <ScenarioSelector
                activeScenario={presScenario}
                onSelect={setPresScenario}
                autoCycling={autoCycling}
                onToggleAutoCycle={handleToggleAutoCycle}
              />
            )}

            {/* Demonstration Controls */}
            <div className="flex justify-center gap-4 mb-4">
              {!demonstrationActive ? (
                <button
                  onClick={handleStartDemonstration}
                  className="px-6 py-3 bg-[#0F5F5F] hover:bg-[#0F7F7F] border border-[#0F9F9F] rounded-lg text-white font-semibold text-sm transition-all duration-300 shadow-lg"
                >
                  ▶ Run Full Operational Demonstration
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="px-6 py-3 bg-[#1e1e1e] border border-[#444] rounded-lg">
                    <p className="text-[#0F9F9F] text-sm font-semibold">
                      Stage {demonstrationStage + 1} of {DEMONSTRATION_STAGES.length}: {DEMONSTRATION_STAGES[demonstrationStage]?.name}
                    </p>
                    <p className="text-[#888] text-xs mt-1 italic">
                      {DEMONSTRATION_STAGES[demonstrationStage]?.message}
                    </p>
                  </div>
                  <button
                    onClick={handleStopDemonstration}
                    className="px-5 py-3 bg-[#3a1010] hover:bg-[#4a1515] border border-[#7A0F0F] rounded-lg text-white font-semibold text-sm transition-all duration-300"
                  >
                    ■ Stop Demonstration
                  </button>
                </div>
              )}
            </div>

            <MitigationCapacity 
              systemState={systemState}
            />

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
            />
          </>
        )}
      </div>
    </div>
  );
}