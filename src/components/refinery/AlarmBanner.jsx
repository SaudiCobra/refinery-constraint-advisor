import React from "react";
import { cn } from "@/lib/utils";

const BANNER_CONFIG = {
  NORMAL: {
    bg: "bg-[#0d2a2a]",
    border: "border-[#0F5F5F]",
    text: "text-[#5FB9B9]",
    message: "Stable — monitoring within normal operating range.",
  },
  EARLY_DRIFT: {
    bg: "bg-[#1a1208]",
    border: "border-[#D35400]",
    text: "text-[#E67E22]",
    message: "Early drift detected — temperature trending upward.",
  },
  SEVERE_DRIFT: {
    bg: "bg-[#1a1210]",
    border: "border-[#A13A1F]",
    text: "text-[#D4653F]",
    message: "Severe drift — operating limit approaching.",
  },
  IMMEDIATE_RISK: {
    bg: "bg-[#140a0a]",
    border: "border-[#7A0F0F]",
    text: "text-[#C0392B]",
    message: "Immediate risk — constraint escalation critical.",
  },
  // Legacy keys for backwards compatibility
  STABLE: {
    bg: "bg-[#0d2a2a]",
    border: "border-[#0F5F5F]",
    text: "text-[#5FB9B9]",
    message: "Stable — monitoring within normal operating range.",
  },
  DRIFT: {
    bg: "bg-[#1a1208]",
    border: "border-[#D35400]",
    text: "text-[#E67E22]",
    message: "Early drift detected — temperature trending upward.",
  },
  CONSTRAINED: {
    bg: "bg-[#1a1210]",
    border: "border-[#A13A1F]",
    text: "text-[#D4653F]",
    message: "Severe drift — operating limit approaching.",
  },
  MODERATION: {
    bg: "bg-[#1a1210]",
    border: "border-[#A13A1F]",
    text: "text-[#D4653F]",
    message: "Severe drift — operating limit approaching.",
  },
  IMMEDIATE: {
    bg: "bg-[#140a0a]",
    border: "border-[#7A0F0F]",
    text: "text-[#C0392B]",
    message: "Immediate risk — constraint escalation critical.",
  },
  HOTSPOT: {
    bg: "bg-[#140a0a]",
    border: "border-[#7A0F0F]",
    text: "text-[#C0392B]",
    message: "Immediate risk — constraint escalation critical.",
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
      <div className="max-w-[1600px] mx-auto flex items-center gap-3">
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
    </div>
  );
}