import React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

const LEVEL_COLORS = {
  0: "#0F5F5F",
  1: "#B47A1F",
  2: "#A13A1F",
  3: "#7A0F0F",
};

export default function ProcessRibbon({ 
  escalationLevel, 
  slope, 
  preheatActive, 
  preheatStatus,
  coolingCapacity 
}) {
  const baseColor = LEVEL_COLORS[escalationLevel] || LEVEL_COLORS[0];
  const animationSpeed = escalationLevel === 0 ? "20s" : escalationLevel === 1 ? "15s" : escalationLevel === 2 ? "10s" : "7s";

  const preheatColor = preheatActive 
    ? slope > 1.5 ? "#A13A1F" : slope > 1.0 ? "#B47A1F" : "#0F5F5F"
    : "#1a1a1a";

  const coolerColor = coolingCapacity === "NORMAL" 
    ? "#2F5D80" 
    : coolingCapacity === "REDUCED" 
    ? "#B47A1F" 
    : "#A13A1F";

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
      <div className="flex items-center justify-center gap-3">
        <ProcessBlock 
          label="Preheat" 
          color={preheatColor}
          active={preheatActive}
          stress={slope > 1.5}
          warning={slope > 1.0 && slope <= 1.5}
        />
        
        <Arrow speed={animationSpeed} color={baseColor} level={escalationLevel} />
        
        <ProcessBlock 
          label="Reactor" 
          color={baseColor}
          pulse={escalationLevel >= 3}
          glow={escalationLevel >= 2}
        />
        
        <Arrow speed={animationSpeed} color={baseColor} level={escalationLevel} />
        
        <ProcessBlock 
          label="Effluent Cooler" 
          color={coolerColor}
          constrained={coolingCapacity === "CONSTRAINED"}
          reduced={coolingCapacity === "REDUCED"}
        />
        
        <Arrow speed={animationSpeed} color={baseColor} level={escalationLevel} />
        
        <ProcessBlock label="Separator" color="#1a1a1a" />
        
        <Arrow speed={animationSpeed} color={baseColor} level={escalationLevel} />
        
        <ProcessBlock label="Column" color="#1a1a1a" />
      </div>
    </div>
  );
}

function ProcessBlock({ label, color, active, stress, warning, pulse, glow, constrained, reduced }) {
  return (
    <div
      className={cn(
        "relative px-6 py-4 rounded-lg border-2 transition-all duration-700",
        pulse && "animate-[pulse_1.2s_ease-in-out_infinite]",
        constrained && "animate-[wiggle_2s_ease-in-out_infinite]"
      )}
      style={{
        backgroundColor: color,
        borderColor: stress ? "#A13A1F" : warning ? "#B47A1F" : reduced ? "#B47A1F" : constrained ? "#A13A1F" : color,
        boxShadow: active ? `0 0 20px ${color}80` : glow ? `0 0 12px ${color}60` : "none",
      }}
    >
      {stress && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#7A0F0F] rounded-l" />}
      <span className="text-[#ddd] text-sm font-medium tracking-wide whitespace-nowrap">{label}</span>
    </div>
  );
}

function Arrow({ speed, color, level }) {
  const arrowColor = level === 3 ? "#7A0F0F" : level === 2 ? "#A13A1F" : level === 1 ? "#B47A1F" : "#444";
  
  return (
    <div className="relative">
      <ChevronRight 
        className={cn("w-6 h-6 transition-all duration-700")}
        style={{ 
          color: arrowColor,
          strokeWidth: level >= 2 ? 3 : 2,
        }}
      />
      {level >= 2 && (
        <div 
          className="absolute inset-0 animate-[ping_2s_ease-in-out_infinite]"
          style={{ color: arrowColor }}
        >
          <ChevronRight className="w-6 h-6" style={{ strokeWidth: 2 }} />
        </div>
      )}
    </div>
  );
}