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

  // Demo clock — single source of truth for timer + state
  const [demoTimeMin, setDemoTimeMin] = useState(75);
  const [demoState,   setDemoState]   = useState("NORMAL");
  const [demoRunning, setDemoRunning]  = useState(true);
  const [mitigationMsg, setMitigationMsg] = useState("");
  
  // Smoothed mitigation state
  const [smoothedTTL, setSmoothedTTL] = useState(null);
  const [smoothedRoR, setSmoothedRoR] = useState(null);

  // Presentation mode state
  const [presScenario, setPresScenario] = useState(0);
  const [autoCycling, setAutoCycling] = useState(false);
  const [sequenceStage, setSequenceStage] = useState(0);
  const [demonstrationActive, setDemonstrationActive] = useState(false);
  const [demonstrationStage, setDemonstrationStage] = useState(0);
  const cycleRef = useRef(null);
  const sequenceRef = useRef(null);
  const demoRef = useRef(null);

  // Demo clock tick: 1 real second = 1 demo minute
  useEffect(() => {
    if (!demoRunning) return;
    const tick = setInterval(() => {
      setDemoTimeMin(prev => {
        const next = Math.max(0, prev - 1);
        // Auto-derive state from time
        if (next > 35) setDemoState("NORMAL");
        else if (next > 5) setDemoState("EARLY_DRIFT");
        else if (next >= 1) setDemoState("SEVERE_DRIFT");
        else setDemoState("IMMEDIATE_RISK");
        return next;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [demoRunning]);

  // Corrective action handler
  const handleMitigate = (action) => {
    const adds = {
      feedReduction: { NORMAL: 2, EARLY_DRIFT: 10, SEVERE_DRIFT: 2, IMMEDIATE_RISK: 0.7 },
      quench:        { NORMAL: 1, EARLY_DRIFT: 5,  SEVERE_DRIFT: 1, IMMEDIATE_RISK: 0.4 },
      cooling:       { NORMAL: 1, EARLY_DRIFT: 6,  SEVERE_DRIFT: 1.5, IMMEDIATE_RISK: 0.5 },
    };
    const caps = { NORMAL: 90, EARLY_DRIFT: 60, SEVERE_DRIFT: 10, IMMEDIATE_RISK: 5 };
    const delta = adds[action]?.[demoState] || 0;
    const cap = caps[demoState] || 90;
    const labels = { feedReduction: "Feed reduced", quench: "Quench increased", cooling: "Cooling boosted" };
    setDemoTimeMin(prev => Math.min(cap, prev + delta));
    setMitigationMsg(`${labels[action]} — window extended by ${delta < 1 ? (delta*60|0)+"s" : delta+"min"}.`);
    setTimeout(() => setMitigationMsg(""), 4000);
  };

  // Quick scenario selector handler
  const handleSelectScenario = (scenario) => {
    const defaults = { NORMAL: 75, EARLY_DRIFT: 33, SEVERE_DRIFT: 4, IMMEDIATE_RISK: 0.7 };
    import("@/components/refinery/calcEngine").then(({ DEMO_SCENARIOS }) => {
      const s = DEMO_SCENARIOS[scenario];
      if (s) {
        setState({ ...state, samples: s.samples, equipment: s.equipment, feedFlow: s.feedFlow, sensorQuality: s.sensorQuality, opMode: s.opMode, demoScenario: scenario });
      }
    });
    setDemoTimeMin(defaults[scenario] ?? 75);
    setDemoState(scenario);
    setDemoRunning(true);
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

  // Get explicit uiState from scenario (if in demo mode)
  const explicitUiState = activeData.demoScenario || null;
  
  // Derive system state from escalation level (temporary scenario-driven mapping)
  const systemState = explicitUiState || getSystemState(getEscalationLevel(Infinity, false, 0, "NORMAL"));
  
  // Calculations
  const currentValue = activeData.samples[activeData.samples.length - 1];
  const baseSlope = computeRateOfRise(activeData.samples, activeData.interval);
  
  // Apply mitigation engine
  const mitigationResult = computeMitigatedRoR(baseSlope, activeData.equipment, systemState, false);
  const effectiveSlope = mitigationResult.effectiveRoR;
  
  const constraints = computeAllConstraints(currentValue, activeData.limits, effectiveSlope);
  const nearest = getNearestConstraint(constraints);
  const baseTimeToNearest = nearest ? nearest.time : Infinity;
  
  // Bed imbalance and hot spot risk
  const beds = simulateBedTemperatures(currentValue, effectiveSlope, activeData.equipment, 0);
  const bedImbalance = computeBedImbalance(beds);
  
  // Cooling capacity assessment
  const coolingCapacity = computeCoolingCapacity(activeData.equipment, effectiveSlope, baseTimeToNearest);
  
  // Hot spot risk
  const hotSpotRisk = computeHotSpotRisk(bedImbalance, activeData.equipment, coolingCapacity, effectiveSlope);
  
  // Compute mitigated time-to-limit
  const highLimit = activeData.limits.hi || activeData.limits.hihi || 370;
  let calculatedTTL = computeMitigatedTimeToLimit(currentValue, highLimit, effectiveSlope);
  
  // Clamp to baseline (prevent over-extension)
  calculatedTTL = clampTimeToBaseline(calculatedTTL, systemState);
  
  // Adjust time based on cooling capacity (legacy adjustment)
  let timeToNearest = adjustTimeToConstraint(calculatedTTL, coolingCapacity);
  
  // Further compress time if hot spot risk is HIGH
  if (hotSpotRisk === "HIGH") {
    timeToNearest = timeToNearest * 0.9;
  }
  
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
  
  let escalationLevel = getEscalationLevel(timeToNearest, activePreheatMode, effectiveSlope, coolingCapacity);
  
  // Adjust escalation for hot spot risk
  escalationLevel = adjustEscalationForHotSpot(escalationLevel, hotSpotRisk, timeToNearest);
  const alarmState = getAlarmState(currentValue, activeData.limits);
  
  // Apply smoothing to prevent instant jumps (2-3 second interpolation)
  useEffect(() => {
    const interval = setInterval(() => {
      setSmoothedTTL(prev => {
        if (prev === null) return timeToNearest;
        return smoothTransition(prev, timeToNearest, 0.12); // ~2.5s smoothing
      });
      setSmoothedRoR(prev => {
        if (prev === null) return effectiveSlope;
        return smoothTransition(prev, effectiveSlope, 0.12);
      });
    }, 100); // Update every 100ms
    
    return () => clearInterval(interval);
  }, [timeToNearest, effectiveSlope]);
  
  // Use smoothed values for display
  const displayTTL = smoothedTTL !== null ? smoothedTTL : timeToNearest;
  const displaySlope = smoothedRoR !== null ? smoothedRoR : effectiveSlope;

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
              uiState={explicitUiState}
              demoTimeMin={demoTimeMin}
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
                demoTimeMin={demoTimeMin}
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