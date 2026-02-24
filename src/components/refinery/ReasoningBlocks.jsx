import React from "react";
import { cn } from "@/lib/utils";
import { formatTime } from "./calcEngine";

export default function ReasoningBlocks({ slope, nearest, constraints, equipment, sensorQuality, units }) {
  const stable = slope <= 0;
  const unavailable = Object.entries(equipment)
    .filter(([, v]) => !v)
    .map(([k]) => {
      const names = { preheatExchanger: "Preheat Exchanger", effluentCooler: "Effluent Cooler", bypassValve: "Bypass Valve", h2Compressor: "H₂ Compressor" };
      return names[k] || k;
    });

  const hiConstraint = constraints.find(c => c.name === "High");
  const hihiConstraint = constraints.find(c => c.name === "High-High");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* System Reasoning */}
      <Block title="System Reasoning" color="blue">
        {stable ? (
          <Line>Rate-of-rise stable or cooling</Line>
        ) : (
          <>
            <Line>Rate-of-rise: {slope.toFixed(2)} {units}/min</Line>
            {nearest && <Line>Margin to {nearest.name}: {nearest.margin.toFixed(1)} {units}</Line>}
            <Line>Escalation window narrowing</Line>
          </>
        )}
      </Block>

      {/* Reality Check */}
      <Block title="Reality Check" color="amber">
        {unavailable.length > 0 ? (
          <>
            <Line>Cooling constrained</Line>
            {unavailable.map(n => <Line key={n}>{n} — unavailable</Line>)}
          </>
        ) : (
          <Line>All levers available</Line>
        )}
        {sensorQuality !== "good" && (
          <Line>Sensor quality: {sensorQuality}</Line>
        )}
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
        <Line>Status: {stable ? "Stable" : "Escalation forming"}</Line>
        {!stable && nearest && (
          <Line>Nearest constraint: Reactor outlet temperature</Line>
        )}
        <Line>Required attention: Rate-of-rise & margin</Line>
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