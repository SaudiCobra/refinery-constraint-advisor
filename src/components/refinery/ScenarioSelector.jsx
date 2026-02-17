import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SCENARIOS } from "./calcEngine";
import { Play, Square } from "lucide-react";

export default function ScenarioSelector({ activeScenario, onSelect, autoCycling, onToggleAutoCycle }) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
      <div className="flex items-center justify-center gap-3">
        <Button
          onClick={onToggleAutoCycle}
          variant={autoCycling ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-9 px-5 text-sm font-semibold transition-all duration-400",
            autoCycling && "bg-[#0F5F5F] border-[#0F9F9F]"
          )}
        >
          {autoCycling ? <Square className="h-3.5 w-3.5 mr-2" /> : <Play className="h-3.5 w-3.5 mr-2" />}
          {autoCycling ? "Stop Auto-Cycle" : "Auto-Cycle Scenarios"}
        </Button>
        
        <div className="relative">
          <Button
            onClick={() => setShowDropdown(!showDropdown)}
            variant="outline"
            size="sm"
            className="h-9 px-4 text-sm transition-all duration-400"
          >
            Scenario {activeScenario + 1}
          </Button>
          
          {showDropdown && (
            <div className="absolute top-full mt-1 right-0 bg-[#1e1e1e] border border-[#333] rounded-lg shadow-xl z-50 min-w-[280px] max-h-[320px] overflow-y-auto">
              {SCENARIOS.map((scenario, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onSelect(idx);
                    setShowDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-xs hover:bg-[#2a2a2a] transition-colors duration-200 border-b border-[#2a2a2a] last:border-0",
                    activeScenario === idx && "bg-[#0F5F5F]/20 text-[#0F9F9F]"
                  )}
                >
                  <span className="font-semibold">{idx + 1}.</span> {scenario.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}