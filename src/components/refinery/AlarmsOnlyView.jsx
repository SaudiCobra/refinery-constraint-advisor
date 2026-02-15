import React from "react";
import { cn } from "@/lib/utils";

export default function AlarmsOnlyView({ currentValue, alarmState, limits, units }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <p className="text-[#666] text-sm uppercase tracking-widest mb-6">Conventional Alarm Status</p>

      {/* Current Value */}
      <div className="mb-8">
        <p className="text-[#888] text-xs uppercase tracking-wider text-center mb-1">Current Value</p>
        <p className="text-[#eee] text-5xl font-light text-center">{currentValue} {units}</p>
      </div>

      {/* Alarm Status */}
      <div className={cn(
        "px-10 py-6 rounded-lg border-2 text-center transition-all duration-500",
        alarmState === "NORMAL" && "bg-[#1a2e1a] border-green-800",
        alarmState === "HIGH" && "bg-[#2e2a1a] border-amber-600",
        alarmState === "CRITICAL" && "bg-[#3a1010] border-red-600",
      )}>
        <p className={cn(
          "text-3xl font-semibold tracking-wide",
          alarmState === "NORMAL" && "text-green-400",
          alarmState === "HIGH" && "text-amber-400",
          alarmState === "CRITICAL" && "text-red-400",
        )}>
          {alarmState === "NORMAL" && "NO ALARM ACTIVE"}
          {alarmState === "HIGH" && "ALARM — HIGH"}
          {alarmState === "CRITICAL" && "CRITICAL ALARM — HIGH HIGH"}
        </p>
      </div>

      {/* Limit Indicators */}
      <div className="flex gap-8 mt-8">
        {limits.hi && (
          <div className="text-center">
            <p className="text-[#666] text-xs uppercase">HI</p>
            <p className={cn("text-lg font-medium", Number(currentValue) >= Number(limits.hi) ? "text-amber-400" : "text-[#888]")}>
              {limits.hi} {units}
            </p>
          </div>
        )}
        {limits.hihi && (
          <div className="text-center">
            <p className="text-[#666] text-xs uppercase">HI-HI</p>
            <p className={cn("text-lg font-medium", Number(currentValue) >= Number(limits.hihi) ? "text-red-400" : "text-[#888]")}>
              {limits.hihi} {units}
            </p>
          </div>
        )}
      </div>

      <p className="text-[#555] text-xs mt-10 tracking-wide">
        Traditional alarm view — no foresight, no margin, no response window
      </p>
    </div>
  );
}