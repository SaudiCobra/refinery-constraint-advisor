import React from "react";
import { cn } from "@/lib/utils";
import { formatTime } from "./calcEngine";

export default function ReasoningBlocks({ slope, nearest, constraints, equipment, sensorQuality, units, systemState, timeToNearest, isPreheatMode = false, preheatRIT = 200 }) {
  // ── Preheat override — replace all four blocks with warm-up context ──────
  if (isPreheatMode) {
    const pct = Math.min(100, Math.round(((preheatRIT - 200) / (335 - 200)) * 100));
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Block title="System Reasoning" color="blue">
          <Line>Operating mode: Reactor warm-up circulation</Line>
          <Line>RIT rising at controlled rate (~0.35°C/s)</Line>
          <Line>Drift escalation logic suspended</Line>
        </Block>
        <Block title="Reality Check" color="amber">
          <Line>No process limits active during preheat</Line>
          <Line>Heat contained in circulation loop</Line>
          <Line>Normal operation resumes at RIT 335°C</Line>
        </Block>
        <Block title="Consequence (if unchanged)" color="red">
          <Line>Preheat complete at ~{pct}% — target 335°C</Line>
          <Line>No limit breach projected during warm-up</Line>
          <Line>Auto-transition to normal simulation on completion</Line>
        </Block>
        <Block title="Shift Summary" color="green">
          <Line>Status: Reactor Preheat Active</Line>
          <Line>RIT: {Math.round(preheatRIT)}°C → target 335°C</Line>
          <Line>Attention focus: Warm-up rate continuity</Line>
        </Block>
      </div>
    );
  }

  const stable = slope <= 0;

  const hiConstraint = constraints.find(c => c.name === "High");
  const hihiConstraint = constraints.find(c => c.name === "High-High");

  // Reality check and shift summary driven by live systemState
  const getRealityCheck = () => {
    if (systemState === "IMMEDIATE_RISK") return ["Mitigation capacity nearly exhausted", "Hard limit breach imminent"];
    if (systemState === "SEVERE_DRIFT")   return ["High-impact interventions required", "Effluent temperature approaching Hi-Hi"];
    if (systemState === "EARLY_DRIFT")    return ["Corrective flexibility remains", "Reactor outlet drifting toward High"];
    return ["Mitigation capacity available", "No hard limits active"];
  };

  const getShiftStatus = () => {
    if (systemState === "IMMEDIATE_RISK") return "Critical — immediate action required";
    if (systemState === "SEVERE_DRIFT")   return "Severe drift — escalating";
    if (systemState === "EARLY_DRIFT")    return "Early drift — monitor closely";
    return "Stable";
  };

  const [realityLine1, realityLine2] = getRealityCheck();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* System Reasoning */}
      <Block title="System Reasoning" color="blue">
        {stable ? (
          <Line>Rate-of-rise: 0.0 {units}/min (stable)</Line>
        ) : (
          <>
            <Line>Rate-of-rise: +{slope.toFixed(1)} {units}/min (confirmed)</Line>
            {nearest && <Line>Margin to {nearest.name.toLowerCase()}: {nearest.margin.toFixed(1)} {units}</Line>}
            <Line>Escalation window: {systemState === "IMMEDIATE_RISK" ? "critical" : "narrowing"}</Line>
          </>
        )}
      </Block>

      {/* Reality Check */}
      <Block title="Reality Check" color="amber">
        <Line>{realityLine1}</Line>
        <Line>{realityLine2}</Line>
      </Block>

      {/* Consequence */}
      <Block title="Consequence (if unchanged)" color="red">
        {stable ? (
          <Line>No escalation projected</Line>
        ) : (
          <>
            {hiConstraint && hiConstraint.time < Infinity && (
              <Line>High limit projected in {formatTime(hiConstraint.time)}</Line>
            )}
            {hihiConstraint && hihiConstraint.time < Infinity && (
              <Line>High-High escalation projected in {formatTime(hihiConstraint.time)}</Line>
            )}
            {!hiConstraint && !hihiConstraint && <Line>Constraints not configured</Line>}
          </>
        )}
      </Block>

      {/* Shift Summary */}
      <Block title="Shift Summary" color="green">
        <Line>Status: {getShiftStatus()}</Line>
        {!stable && nearest && (
          <Line>Nearest constraint: {nearest.name}</Line>
        )}
        <Line>Attention focus: Rate-of-rise & margin</Line>
      </Block>
    </div>
  );
}

function Block({ title, color, children }) {
  const colors = {
    blue: "border-blue-800/50",
    amber: "border-amber-800/50",
    red: "border-red-800/50",
    green: "border-green-800/50",
  };
  return (
    <div className={cn("bg-[#1e1e1e] border rounded-lg p-4", colors[color] || "border-[#333]")}>
      <h4 className="text-[#777] text-xs uppercase tracking-wider mb-2">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Line({ children }) {
  return <p className="text-[#ccc] text-sm leading-snug">• {children}</p>;
}