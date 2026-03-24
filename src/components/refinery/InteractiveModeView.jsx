import React from "react";
import QuickScenarioSelector from "@/components/refinery/QuickScenarioSelector";
import HeroMetric from "@/components/refinery/HeroMetric";
import DecisionWindowBar from "@/components/refinery/DecisionWindowBar";
import LeverContext from "@/components/refinery/LeverContext";
import OpsCapacityPanel from "@/components/refinery/OpsCapacityPanel";
import ProcessMap from "@/components/refinery/ProcessMap";
import InputPanel from "@/components/refinery/InputPanel";
import ReasoningBlocks from "@/components/refinery/ReasoningBlocks";
import ExecutiveRibbon from "@/components/refinery/ExecutiveRibbon";
import AcknowledgeSystem from "@/components/refinery/AcknowledgeSystem";

export default function InteractiveModeView({
  isPreheatRunning, isPreheatDone, preheatTemps, theme,
  derivedSystemState, handleSelectScenario,
  displayTTL, escalationLevel, displaySlope, systemState, demoState, currentValue,
  activeData, coolingCapacity, hotSpotRisk, nearest, constraints, bedImbalance,
  preheatActive, preheatStatus, activePreheatMode,
  handleMitigate, mitigationMsg, feedReductionActive, quenchBoostActive, coolingBoostActive,
  rampProgress, minutesRecovered,
  state, setState, handleRunDemo, setPreheatActive,
}) {
  return (
    <>
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
  );
}