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
  const cycleRef = useRef(null);
  const sequenceRef = useRef(null);

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
    if (displayMode === "presentation" && currentScenario?.isSequence && !autoCycling) {
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
  }, [presScenario, displayMode, autoCycling]);

  // Determine active data source
  const activeData = displayMode === "presentation"
    ? (() => {
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
  
  // Preheat status
  const ACTIVATION_LOWER = 280;
  const ACTIVATION_UPPER = 330;
  let preheatStatus = null;
  if (preheatActive) {
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
  
  const escalationLevel = getEscalationLevel(timeToNearest, preheatActive, slope, coolingCapacity);
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
            <ScenarioSelector
              activeScenario={presScenario}
              onSelect={setPresScenario}
              autoCycling={autoCycling}
              onToggleAutoCycle={handleToggleAutoCycle}
            />

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
              interactive={false}
              units={activeData.units}
            />

            <PresentationHero
              timeToNearest={timeToNearest}
              nearestName={nearest?.name}
              escalationLevel={escalationLevel}
              slope={slope}
              equipment={activeData.equipment}
              preheatActive={preheatActive}
              preheatStatus={preheatStatus}
              coolingCapacity={coolingCapacity}
            />
          </>
        )}
      </div>
    </div>
  );
}