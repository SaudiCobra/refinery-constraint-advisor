import React from "react";
import { cn } from "@/lib/utils";

const BANNER_CONFIG = {
  STABLE: {
    bg: "bg-[#0d2a2a]",
    border: "border-[#0F5F5F]",
    text: "text-[#0F9F9F]",
    label: "System Stable",
  },
  DRIFT: {
    bg: "bg-[#2a1a0d]",
    border: "border-[#B47A1F]",
    text: "text-[#D4A547]",
    label: "Early Drift Detected",
  },
  CONSTRAINED: {
    bg: "bg-[#2a0d0d]",
    border: "border-[#A13A1F]",
    text: "text-[#D4653F]",
    label: "Cooling Constrained",
  },
  MODERATION: {
    bg: "bg-[#2a0d0d]",
    border: "border-[#A13A1F]",
    text: "text-[#D4653F]",
    label: "Moderation Limited",
  },
  IMMEDIATE: {
    bg: "bg-[#1a0a0a]",
    border: "border-[#7A0F0F]",
    text: "text-[#B53F3F]",
    label: "Immediate Risk",
  },
  HOTSPOT: {
    bg: "bg-[#1a0a0a]",
    border: "border-[#7A0F0F]",
    text: "text-[#B53F3F]",
    label: "Immediate Risk — Hot Spot Developing",
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
        "border-b-4 px-6 py-4 transition-all duration-400",
        config.bg,
        config.border
      )}
    >
      <div className="max-w-[1600px] mx-auto flex items-center gap-4">
        <div
          className={cn(
            "w-3 h-3 rounded-full flex-shrink-0",
            config.text.replace("text-", "bg-")
          )}
        />
        <h2 className={cn("text-xl font-bold tracking-tight", config.text)}>
          {config.label}
        </h2>
      </div>
    </div>
  );
}