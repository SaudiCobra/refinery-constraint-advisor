import React from "react";
import ScenarioAnnouncer from "@/components/refinery/ScenarioAnnouncer";
import PresentationHero from "@/components/refinery/PresentationHero";
import PresenterControls from "@/components/refinery/PresenterControls";
import OpsCapacityPanel from "@/components/refinery/OpsCapacityPanel";
import ProcessMap from "@/components/refinery/ProcessMap";
import { SCENARIOS } from "@/components/refinery/calcEngine";

export default function PresentationModeView({
  presScenario, onSelectScenario, onReset,
  displayTTL, nearest, escalationLevel, displaySlope,
  activeData, activePreheatMode, preheatStatus, coolingCapacity,
  bedImbalance, hotSpotRisk, awarenessPhase,
  systemState, currentValue,
}) {
  return (
    <>
      <ScenarioAnnouncer label={SCENARIOS[presScenario]?.name?.replace(/^\d+\.\s*/, "")} />

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

      <PresenterControls
        presScenario={presScenario}
        onSelectScenario={onSelectScenario}
        onReset={onReset}
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
  );
}