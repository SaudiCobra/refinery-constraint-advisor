import React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/refinery/ThemeContext";

const BANNER_CONFIG = {
  NORMAL: {
    bgDark: "bg-[#0d2a2a]", bgLight: "bg-[#e4f4f4]",
    borderDark: "border-[#0F5F5F]", borderLight: "border-[#1a9f9f]",
    textDark: "text-[#5FB9B9]", textLight: "text-[#0a6b6b]",
    message: "Stable — monitoring within normal operating range.",
  },
  EARLY_DRIFT: {
    bgDark: "bg-[#1a1208]", bgLight: "bg-[#fdf6e8]",
    borderDark: "border-[#D35400]", borderLight: "border-[#c05a00]",
    textDark: "text-[#E67E22]", textLight: "text-[#8b3e00]",
    message: "Early drift detected — temperature trending upward.",
  },
  SEVERE_DRIFT: {
    bgDark: "bg-[#1a1210]", bgLight: "bg-[#fdf0ec]",
    borderDark: "border-[#A13A1F]", borderLight: "border-[#8b2c12]",
    textDark: "text-[#D4653F]", textLight: "text-[#7a2010]",
    message: "Severe drift — operating limit approaching.",
  },
  IMMEDIATE_RISK: {
    bgDark: "bg-[#140a0a]", bgLight: "bg-[#fce8e8]",
    borderDark: "border-[#7A0F0F]", borderLight: "border-[#6b0f0f]",
    textDark: "text-[#C0392B]", textLight: "text-[#5a0a0a]",
    message: "Immediate risk — constraint escalation critical.",
  },
  STABLE: {
    bgDark: "bg-[#0d2a2a]", bgLight: "bg-[#e4f4f4]",
    borderDark: "border-[#0F5F5F]", borderLight: "border-[#1a9f9f]",
    textDark: "text-[#5FB9B9]", textLight: "text-[#0a6b6b]",
    message: "Stable — monitoring within normal operating range.",
  },
  DRIFT: {
    bgDark: "bg-[#1a1208]", bgLight: "bg-[#fdf6e8]",
    borderDark: "border-[#D35400]", borderLight: "border-[#c05a00]",
    textDark: "text-[#E67E22]", textLight: "text-[#8b3e00]",
    message: "Early drift detected — temperature trending upward.",
  },
  CONSTRAINED: {
    bgDark: "bg-[#1a1210]", bgLight: "bg-[#fdf0ec]",
    borderDark: "border-[#A13A1F]", borderLight: "border-[#8b2c12]",
    textDark: "text-[#D4653F]", textLight: "text-[#7a2010]",
    message: "Severe drift — operating limit approaching.",
  },
  MODERATION: {
    bgDark: "bg-[#1a1210]", bgLight: "bg-[#fdf0ec]",
    borderDark: "border-[#A13A1F]", borderLight: "border-[#8b2c12]",
    textDark: "text-[#D4653F]", textLight: "text-[#7a2010]",
    message: "Severe drift — operating limit approaching.",
  },
  IMMEDIATE: {
    bgDark: "bg-[#140a0a]", bgLight: "bg-[#fce8e8]",
    borderDark: "border-[#7A0F0F]", borderLight: "border-[#6b0f0f]",
    textDark: "text-[#C0392B]", textLight: "text-[#5a0a0a]",
    message: "Immediate risk — constraint escalation critical.",
  },
  HOTSPOT: {
    bgDark: "bg-[#140a0a]", bgLight: "bg-[#fce8e8]",
    borderDark: "border-[#7A0F0F]", borderLight: "border-[#6b0f0f]",
    textDark: "text-[#C0392B]", textLight: "text-[#5a0a0a]",
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
  const { theme } = useTheme();
  const isLight = theme === "light";

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
    <div className={cn(
      "border-b-2 px-6 py-3 transition-all duration-400",
      isLight ? config.bgLight : config.bgDark,
      isLight ? config.borderLight : config.borderDark,
    )}>
      <div className="max-w-[1600px] mx-auto flex items-center gap-4">
        <div className={cn(
          "w-2 h-2 rounded-full flex-shrink-0",
          (isLight ? config.textLight : config.textDark).replace("text-", "bg-")
        )} />
        <span className={cn(
          "text-xs font-semibold tracking-widest opacity-90 flex-shrink-0",
          isLight ? "text-[#6b7280]" : "text-[#666]"
        )}>
          SYSTEM STATUS
        </span>
        <div className={cn("w-px h-4 opacity-40 flex-shrink-0", isLight ? "bg-[#9ca3af]" : "bg-[#444]")} />
        <p className={cn("text-base font-medium tracking-wide", isLight ? config.textLight : config.textDark)}>
          {config.message}
        </p>
      </div>
    </div>
  );
}