import React from "react";
import { cn } from "@/lib/utils";

const LOCKED_MESSAGE = "System Status: Advisory mode — operator retains control.";

const BANNER_CONFIG = {
  NORMAL: {
    bg: "bg-[#0d2a2a]",
    border: "border-[#0F5F5F]",
    text: "text-[#5FB9B9]",
    dotColor: "#5FB9B9",
  },
  EARLY_DRIFT: {
    bg: "bg-[#1a1208]",
    border: "border-[#D35400]",
    text: "text-[#E67E22]",
    dotColor: "#E67E22",
  },
  SEVERE_DRIFT: {
    bg: "bg-[#1a1210]",
    border: "border-[#A13A1F]",
    text: "text-[#D4653F]",
    dotColor: "#D4653F",
  },
  IMMEDIATE_RISK: {
    bg: "bg-[#140a0a]",
    border: "border-[#7A0F0F]",
    text: "text-[#C0392B]",
    dotColor: "#C0392B",
  },
  // Legacy keys for backwards compatibility
  STABLE: {
    bg: "bg-[#0d2a2a]",
    border: "border-[#0F5F5F]",
    text: "text-[#5FB9B9]",
    dotColor: "#5FB9B9",
  },
  DRIFT: {
    bg: "bg-[#1a1208]",
    border: "border-[#D35400]",
    text: "text-[#E67E22]",
    dotColor: "#E67E22",
  },
  CONSTRAINED: {
    bg: "bg-[#1a1210]",
    border: "border-[#A13A1F]",
    text: "text-[#D4653F]",
    dotColor: "#D4653F",
  },
  MODERATION: {
    bg: "bg-[#1a1210]",
    border: "border-[#A13A1F]",
    text: "text-[#D4653F]",
    dotColor: "#D4653F",
  },
  IMMEDIATE: {
    bg: "bg-[#140a0a]",
    border: "border-[#7A0F0F]",
    text: "text-[#C0392B]",
    dotColor: "#C0392B",
  },
  HOTSPOT: {
    bg: "bg-[#140a0a]",
    border: "border-[#7A0F0F]",
    text: "text-[#C0392B]",
    dotColor: "#C0392B",
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
  displayMode = "interactive",
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
  const shouldPulse = displayMode !== "presentation";

  return (
    <>
      <style>{`
        @keyframes banner-pulse {
          0%, 100% { opacity: 0.92; }
          50% { opacity: 1; }
        }
        .banner-pulse-enabled {
          animation: banner-pulse 2.8s ease-in-out infinite;
        }
      `}</style>
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
              shouldPulse && "banner-pulse-enabled"
            )}
            style={{
              backgroundColor: config.dotColor,
            }}
          />
          <p className={cn("text-base font-medium tracking-wide", shouldPulse && "banner-pulse-enabled", config.text)}>
            {LOCKED_MESSAGE}
          </p>
        </div>
      </div>
    </>
  );
}