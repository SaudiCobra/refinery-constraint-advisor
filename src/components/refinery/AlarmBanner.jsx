import React from "react";
import { cn } from "@/lib/utils";

const BANNER_CONFIG = {
  NORMAL: {
    bg: "bg-[#0F3F3F]",
    border: "border-[#0F7F7F]",
    text: "text-[#0F9F9F]",
    label: "NORMAL",
    sub: "All parameters within operating envelope",
  },
  HIGH: {
    bg: "bg-[#3F2F1F]",
    border: "border-[#B47A1F]",
    text: "text-[#D4A547]",
    label: "ALARM — HIGH",
    sub: "High alarm active",
  },
  CRITICAL: {
    bg: "bg-[#3F1F1F]",
    border: "border-[#A13A1F]",
    text: "text-[#D4653F]",
    label: "CRITICAL ALARM — HIGH HIGH",
    sub: "High-High alarm active",
  },
  LEVEL3: {
    bg: "bg-[#3a1010]",
    border: "border-[#7A0F0F]",
    text: "text-[#B53F3F]",
    label: "IMMEDIATE ESCALATION REQUIRED",
    sub: "Constraint breach imminent",
  },
};

export default function AlarmBanner({ alarmState, escalationLevel, alarmsOnly }) {
  let key = alarmState;
  if (!alarmsOnly && escalationLevel >= 3 && alarmState !== "CRITICAL") {
    key = "LEVEL3";
  }
  const config = BANNER_CONFIG[key] || BANNER_CONFIG.NORMAL;

  return (
    <div
      className={cn(
        "w-full border-b px-6 py-3 transition-all duration-500",
        config.bg,
        config.border
      )}
    >
      <div className="flex items-center justify-between max-w-[1600px] mx-auto">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "w-3 h-3 rounded-full",
              key === "NORMAL" && "bg-green-500",
              key === "HIGH" && "bg-amber-500",
              key === "CRITICAL" && "bg-red-500",
              key === "LEVEL3" && "bg-red-500 animate-pulse"
            )}
          />
          <span className={cn("text-lg font-semibold tracking-wide", config.text)}>
            {config.label}
          </span>
        </div>
        <span className={cn("text-sm opacity-70", config.text)}>{config.sub}</span>
      </div>
    </div>
  );
}