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
  const [simTemp,   setSimTemp]   = useState(352);   // currentOutletTempC
  const [simRoR,    setSimRoR]    = useState(0.30);  // rateOfRiseC_per_min
  const [simRunning, setSimRunning] = useState(true);
  const [mitigationMsg, setMitigationMsg] = useState("");

  // Smoothed TTL for display (prevents jumps > 3 min per tick)
  const [smoothedTTL, setSmoothedTTL] = useState(null);
  const simTempRef = useRef(352);
  const simRoRRef  = useRef(0.30);

  // Scenario-band RoR clamps
  const ROR_CLAMPS = {
    NORMAL:         { min: 0.10, max: 0.55, noise: 0.04 },
    EARLY_DRIFT:    { min: 0.25, max: 0.70, noise: 0.05 },
    SEVERE_DRIFT:   { min: 0.55, max: 1.20, noise: 0.06 },
    IMMEDIATE_RISK: { min: 0.90, max: 2.00, noise: 0.07 },
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

  // ── Real-time physics tick (1 000 ms = 1/60 of a demo-minute) ───────────────
  // dt = 1/60 min  →  temp changes by RoR * dt each real second.
  useEffect(() => {
    if (!simRunning || displayMode !== "interactive") return;
    const DT = 1 / 60; // real seconds → demo minutes

    const tick = setInterval(() => {
      // Read current sim vars from refs (avoids stale closure)
      let temp = simTempRef.current;
      let ror  = simRoRRef.current;
      const limits = state.limits;

      const currentTTL = getSimTTL(temp, ror, limits);
      const band = getSystemState(currentTTL);
      const clamp = ROR_CLAMPS[band] || ROR_CLAMPS.NORMAL;

      // Wander RoR with bounded noise, clamped to band
      const rorNoise = (Math.random() - 0.5) * 2 * clamp.noise;
      ror = Math.max(clamp.min, Math.min(clamp.max, ror + rorNoise));

      // Advance temperature
      const tempNoise = (Math.random() - 0.5) * 0.05;
      temp = temp + ror * DT + tempNoise * DT;

      // Write back to refs
      simTempRef.current = temp;
      simRoRRef.current  = ror;

      // Compute new raw TTL
      const rawTTL = getSimTTL(temp, ror, limits);

      // Smooth: cap jump to 3 min per tick
      setSmoothedTTL(prev => {
        if (prev === null) return rawTTL;
        const delta = rawTTL - prev;
        const capped = prev + Math.max(-3, Math.min(3, delta));
        return Math.max(0, capped);
      });

      // Keep React state in sync for display (batched)
      setSimTemp(temp);
      setSimRoR(ror);
    }, 1000);

    return () => clearInterval(tick);
  }, [simRunning, displayMode, state.limits]);

  // Corrective action: reduce RoR to extend window
  const handleMitigate = (action) => {
    const rorReductions = { feedReduction: 0.15, quench: 0.08, cooling: 0.10 };
    const labels = { feedReduction: "Feed reduced", quench: "Quench increased", cooling: "Cooling boosted" };
    const reduction = rorReductions[action] || 0;
    const newRoR = Math.max(0.05, simRoRRef.current - reduction);
    simRoRRef.current = newRoR;
    setSimRoR(newRoR);
    const extMin = (reduction / Math.max(newRoR, 0.05)).toFixed(1);
    setMitigationMsg(`${labels[action]} — RoR reduced, window extended ~${extMin} min.`);
    setTimeout(() => setMitigationMsg(""), 4000);
  };

  // Quick scenario selector: seed physics sim to correct starting conditions
  const SCENARIO_SEEDS = {
    NORMAL:         { temp: 352, ror: 0.30, limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" } },
    EARLY_DRIFT:    { temp: 360, ror: 0.35, limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" } },
    SEVERE_DRIFT:   { temp: 362, ror: 0.80, limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" } },
    IMMEDIATE_RISK: { temp: 366, ror: 1.35, limits: { hi: 370, hihi: 380, spec: "", trip: 390, rampRate: "" } },
  };
  const handleSelectScenario = (scenario) => {
    const seed = SCENARIO_SEEDS[scenario] || SCENARIO_SEEDS.NORMAL;
    simTempRef.current = seed.temp;
    simRoRRef.current  = seed.ror;
    setSimTemp(seed.temp);
    setSimRoR(seed.ror);
    setSmoothedTTL(null); // reset smoother
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

  // Get explicit uiState from scenario (if set)
  const explicitUiState = activeData.demoScenario || null;

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
      if (slope > 1.5) {
        preheatStatus = "Thermal stress risk";
      } else if (slope > 1.0) {
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
  const computedState = getSystemState(timeToNearest);
  const systemState   = explicitUiState || computedState;
  const demoState     = computedState; // alias used by child components
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
        demoState={displayMode === "interactive" ? demoState : undefined}
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
              activeScenario={demoState}
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