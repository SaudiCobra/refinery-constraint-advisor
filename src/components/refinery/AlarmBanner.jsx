import React from "react";
import { cn } from "@/lib/utils";

const BANNER_CONFIG = {
  NORMAL: {
    bg: "bg-[#0d2a2a]",
    border: "border-[#0F5F5F]",
    text: "text-[#5FB9B9]",
    message: "System Status: Stable — No constraint risk identified",
    submessage: "No action required. Monitoring for rate-of-change deviation.",
  },
  EARLY_DRIFT: {
    bg: "bg-[#1a1208]",
    border: "border-[#D35400]",
    text: "text-[#E67E22]",
    message: "System Status: Early Constraint Drift — Temperature trajectory upward",
  },
  SEVERE_DRIFT: {
    bg: "bg-[#1a1210]",
    border: "border-[#A13A1F]",
    text: "text-[#D4653F]",
    message: "System Status: Severe Constraint Drift — Operating limit approaching",
    submessage: "Operator decision window narrowing — mitigation sequencing advised.",
  },
  IMMEDIATE_RISK: {
    bg: "bg-[#140a0a]",
    border: "border-[#7A0F0F]",
    text: "text-[#C0392B]",
    message: "IMMEDIATE RISK — Constraint escalation critical",
  },
  // Legacy keys for backwards compatibility
  STABLE: {
    bg: "bg-[#0d2a2a]",
    border: "border-[#0F5F5F]",
    text: "text-[#5FB9B9]",
    message: "System Status: Stable — No constraint risk identified",
    submessage: "No action required. Monitoring for rate-of-change deviation.",
  },
  DRIFT: {
    bg: "bg-[#1a1208]",
    border: "border-[#D35400]",
    text: "text-[#E67E22]",
    message: "System Status: Early Constraint Drift — Temperature trajectory upward",
  },
  CONSTRAINED: {
    bg: "bg-[#1a1210]",
    border: "border-[#A13A1F]",
    text: "text-[#D4653F]",
    message: "System Status: Heat Removal Constrained — Cooling capacity limited",
  },
  MODERATION: {
    bg: "bg-[#1a1210]",
    border: "border-[#A13A1F]",
    text: "text-[#D4653F]",
    message: "System Status: Moderation Limited — Hydrogen authority reduced",
  },
  IMMEDIATE: {
    bg: "bg-[#140a0a]",
    border: "border-[#7A0F0F]",
    text: "text-[#C0392B]",
    message: "IMMEDIATE RISK — Constraint escalation critical",
  },
  HOTSPOT: {
    bg: "bg-[#140a0a]",
    border: "border-[#7A0F0F]",
    text: "text-[#C0392B]",
    message: "IMMEDIATE RISK — Hot spot developing in reactor bed",
  },
};

export default function AlarmBanner({ 
  alarmState, 
  escalationLevel, 
  alarmsOnly,
  hotSpotRisk,
  timeToNearest,
  coolingCapacity,
  equipment,
  slope,
  preheatStatus,
  uiState,
  demoState,
}) {
  // Demo state takes priority, then explicit uiState, then inference
  const activeState = demoState || uiState;
  let bannerKey = activeState || "NORMAL";
  
  if (!activeState) {
    if (!alarmsOnly) {
      if (hotSpotRisk === "HIGH") bannerKey = "HOTSPOT";
      else if (timeToNearest < 1 && timeToNearest > 0) bannerKey = "IMMEDIATE_RISK";
      else if (timeToNearest < 10 && timeToNearest > 0) bannerKey = "SEVERE_DRIFT";
      else if (!equipment?.h2Compressor && escalationLevel >= 1) bannerKey = "MODERATION";
      else if (slope > 1.5 || preheatStatus?.includes("stress")) bannerKey = "EARLY_DRIFT";
      else if (escalationLevel >= 1) bannerKey = "EARLY_DRIFT";
    } else {
      bannerKey = alarmState === "NORMAL" ? "NORMAL" : alarmState === "HIGH" ? "EARLY_DRIFT" : "IMMEDIATE_RISK";
    }
  }

  const config = BANNER_CONFIG[bannerKey] || BANNER_CONFIG.NORMAL;

  return (
    <div
      className={cn(
        "border-b-2 px-6 py-3 transition-all duration-500",
        config.bg,
        config.border
      )}
    >
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-2 h-2 rounded-full flex-shrink-0",
              config.text.replace("text-", "bg-")
            )}
          />
          <p className={cn("text-base font-medium tracking-wide", config.text)}>
            {config.message}
          </p>
        </div>
        {config.submessage && (
          <p className="text-[#444] text-xs mt-1.5 ml-5">
            {config.submessage}
          </p>
        )}
      </div>
    </div>
  );
}