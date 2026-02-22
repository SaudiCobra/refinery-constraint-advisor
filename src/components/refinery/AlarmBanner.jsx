import React from "react";
import { cn } from "@/lib/utils";

const BANNER_CONFIG = {
  STABLE: {
    bg: "bg-[#0d2a2a]",
    border: "border-[#0F5F5F]",
    text: "text-[#5FB9B9]",
    message: "System State: Normal — All parameters within range",
  },
  DRIFT: {
    bg: "bg-[#1a1410]",
    border: "border-[#B47A1F]",
    text: "text-[#D4A547]",
    message: "System State: Early Drift — Temperature trending upward",
  },
  CONSTRAINED: {
    bg: "bg-[#1a1210]",
    border: "border-[#A13A1F]",
    text: "text-[#D4653F]",
    message: "System State: Heat Removal Constrained — Cooling capacity limited",
  },
  MODERATION: {
    bg: "bg-[#1a1210]",
    border: "border-[#A13A1F]",
    text: "text-[#D4653F]",
    message: "System State: Moderation Limited — Hydrogen authority reduced",
  },
  IMMEDIATE: {
    bg: "bg-[#1a0f0f]",
    border: "border-[#7A0F0F]",
    text: "text-[#C97A7A]",
    message: "System State: Immediate Risk — Escalation projected within minutes",
  },
  HOTSPOT: {
    bg: "bg-[#1a0f0f]",
    border: "border-[#7A0F0F]",
    text: "text-[#C97A7A]",
    message: "System State: Immediate Risk — Hot spot developing in reactor bed",
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
}) {
  // Determine banner state based on strict priority
  let bannerKey = "STABLE";
  
  if (!alarmsOnly) {
    if (hotSpotRisk === "HIGH") {
      bannerKey = "HOTSPOT";
    } else if (timeToNearest < 10 && timeToNearest > 0) {
      bannerKey = "IMMEDIATE";
    } else if (coolingCapacity === "CONSTRAINED") {
      bannerKey = "CONSTRAINED";
    } else if (!equipment?.h2Compressor && escalationLevel >= 1) {
      bannerKey = "MODERATION";
    } else if (slope > 1.5 || preheatStatus?.includes("stress")) {
      bannerKey = "DRIFT";
    } else if (escalationLevel >= 1) {
      bannerKey = "DRIFT";
    }
  } else {
    // Alarms-only mode uses traditional alarm states
    bannerKey = alarmState === "NORMAL" ? "STABLE" : alarmState === "HIGH" ? "DRIFT" : "IMMEDIATE";
  }

  const config = BANNER_CONFIG[bannerKey] || BANNER_CONFIG.STABLE;

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