import React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/refinery/ThemeContext";

const SCENARIOS = [
  { key: "NORMAL", label: "Normal", color: "text-[#0F9F9F] border-[#0F7F7F] hover:bg-[#0F5F5F]/20" },
  { key: "EARLY_DRIFT", label: "Early Drift", color: "text-[#E67E22] border-[#D35400] hover:bg-[#D35400]/20" },
  { key: "SEVERE_DRIFT", label: "Severe Drift", color: "text-[#D4653F] border-[#A13A1F] hover:bg-[#A13A1F]/20" },
  { key: "IMMEDIATE_RISK", label: "Immediate Risk", color: "text-[#C0392B] border-[#7A0F0F] hover:bg-[#7A0F0F]/20" },
];

export default function QuickScenarioSelector({ activeScenario, onSelect }) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className="flex justify-center gap-2 py-3">
      <span className={cn("text-sm self-center mr-2 transition-colors duration-300", isLight ? "text-[#9ca3af]" : "text-[#666]")}>Quick Select:</span>
      {SCENARIOS.map(({ key, label, color }) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold rounded border-2 transition-all duration-300",
            activeScenario === key 
              ? color.replace("hover:bg", "bg") + " opacity-100" 
              : isLight ? "border-[#d1d8e8] text-[#9ca3af] hover:border-[#a0aec0] opacity-80" : "border-[#333] text-[#666] hover:border-[#555] opacity-70"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}