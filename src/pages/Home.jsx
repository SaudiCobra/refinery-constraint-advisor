import React, { useState, useEffect, useCallback, useRef } from "react";
import GlobalHeader from "@/components/refinery/GlobalHeader";
import AlarmBanner from "@/components/refinery/AlarmBanner";
import HeroMetric from "@/components/refinery/HeroMetric";
import InputPanel from "@/components/refinery/InputPanel";
import ReasoningBlocks from "@/components/refinery/ReasoningBlocks";
import AcknowledgeSystem from "@/components/refinery/AcknowledgeSystem";
import ExecutiveRibbon from "@/components/refinery/ExecutiveRibbon";
import AlarmsOnlyView from "@/components/refinery/AlarmsOnlyView";
import ScenarioSelector from "@/components/refinery/ScenarioSelector";
import PresentationHero from "@/components/refinery/PresentationHero";
import ProcessMap from "@/components/refinery/ProcessMap";
import PreheatIndicator from "@/components/refinery/PreheatIndicator";
import CoolingCapacityIndicator from "@/components/refinery/CoolingCapacityIndicator";
import {
  computeRateOfRise,
  computeAllConstraints,
  getNearestConstraint,
  getEscalationLevel,
  getAlarmState,
  getRecommendation,
  formatTime,
  computeCoolingCapacity,
  adjustTimeToConstraint,
  SCENARIOS,
  DEMONSTRATION_STAGES,
} from "@/components/refinery/calcEngine";

const DEFAULTS = {
  varName: "NHT Reactor Inlet Temperature",
  units: "°C",
  interval: 2,
  samples: [358, 360, 362, 364, 366],
  limits: { hi: 370, hihi: 380, spec: 375, trip: 390, rampRate: "" },
  opMode: "steady",
  sensorQuality: "good",
  equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
  feedFlow: 100000,
};

export default function Home() {
  const [displayMode, setDisplayMode] = useState("interactive");
  const [alarmsOnly, setAlarmsOnly] = useState(false);
  const [state, setState] = useState({ ...DEFAULTS });
  const [preheatActive, setPreheatActive] = useState(false);

  // Presentation mode state
  const [presScenario, setPresScenario] = useState(0);
  const [autoCycling, setAutoCycling] = useState(false);
  const [sequenceStage, setSequenceStage] = useState(0);
  const [demonstrationActive, setDemonstrationActive] = useState(false);
  const [demonstrationStage, setDemonstrationStage] = useState(0);
  const cycleRef = useRef(null);
  const sequenceRef = useRef(null);
  const demoRef = useRef(null);

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

  // Calculations
  const currentValue = activeData.samples[activeData.samples.length - 1];
  const slope = computeRateOfRise(activeData.samples, activeData.interval);
  const constraints = computeAllConstraints(currentValue, activeData.limits, slope);
  const nearest = getNearestConstraint(constraints);
  const baseTimeToNearest = nearest ? nearest.time : Infinity;
  
  // Cooling capacity assessment
  const coolingCapacity = computeCoolingCapacity(activeData.equipment, slope, baseTimeToNearest);
  
  // Adjust time based on cooling capacity
  const timeToNearest = adjustTimeToConstraint(baseTimeToNearest, coolingCapacity);
  
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
  
  const escalationLevel = getEscalationLevel(timeToNearest, activePreheatMode, slope, coolingCapacity);
  const alarmState = getAlarmState(currentValue, activeData.limits);

  const consequence = nearest && nearest.time < Infinity
    ? `If unchanged: ${nearest.name} in ${formatTime(timeToNearest)}`
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

  const bgDimming = escalationLevel >= 2 ? "bg-[#0d0d0d]" : escalationLevel >= 1 ? "bg-[#0f0f0f]" : "bg-[#111]";

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
      />

      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 space-y-6">
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
            <HeroMetric
              timeToNearest={timeToNearest}
              nearestName={nearest?.name}
              escalationLevel={escalationLevel}
              slope={slope}
              consequence={consequence}
            />

            <PreheatIndicator
              preheatActive={preheatActive}
              onToggle={setPreheatActive}
              currentTemp={currentValue}
              slope={slope}
            />

            <CoolingCapacityIndicator capacity={coolingCapacity} />

            <ProcessMap
              escalationLevel={escalationLevel}
              slope={slope}
              currentTemp={currentValue}
              feedFlow={activeData.feedFlow}
              equipment={activeData.equipment}
              preheatActive={preheatActive}
              preheatStatus={preheatStatus}
              coolingCapacity={coolingCapacity}
              nearest={nearest}
              timeToNearest={timeToNearest}
              sensorQuality={activeData.sensorQuality}
              opMode={activeData.opMode}
              interactive={true}
              units={activeData.units}
            />

            <InputPanel
              state={state}
              onChange={setState}
              onRunDemo={handleRunDemo}
            />

            <ReasoningBlocks
              slope={slope}
              nearest={nearest}
              constraints={constraints}
              equipment={activeData.equipment}
              sensorQuality={activeData.sensorQuality}
              units={activeData.units}
            />

            <AcknowledgeSystem />

            <ExecutiveRibbon
              timeToNearest={timeToNearest}
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

            <ProcessMap
              escalationLevel={escalationLevel}
              slope={slope}
              currentTemp={currentValue}
              feedFlow={activeData.feedFlow}
              equipment={activeData.equipment}
              preheatActive={activePreheatMode}
              preheatStatus={preheatStatus}
              coolingCapacity={coolingCapacity}
              nearest={nearest}
              timeToNearest={timeToNearest}
              sensorQuality={activeData.sensorQuality}
              opMode={activeData.opMode}
              interactive={false}
              units={activeData.units}
            />

            <PresentationHero
              timeToNearest={timeToNearest}
              nearestName={nearest?.name}
              escalationLevel={escalationLevel}
              slope={slope}
              equipment={activeData.equipment}
              preheatActive={activePreheatMode}
              preheatStatus={preheatStatus}
              coolingCapacity={coolingCapacity}
              sensorQuality={activeData.sensorQuality}
              opMode={activeData.opMode}
            />
          </>
        )}
      </div>
    </div>
  );
}