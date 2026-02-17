import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SCENARIOS } from "./calcEngine";
import { Play, Square } from "lucide-react";

export default function ScenarioSelector({ activeScenario, onSelect, autoCycling, onToggleAutoCycle }) {
  return (
    <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[#888] text-xs uppercase tracking-wider font-medium">Scenario</p>
        <Button
          onClick={onToggleAutoCycle}
          variant="outline"
          size="sm"
          className={cn(
            "text-xs border-[#444] bg-transparent",
            autoCycling ? "text-amber-400 border-amber-700" : "text-[#aaa] hover:text-white"
          )}
        >
          {autoCycling ? <Square className="w-3 h-3 mr-1.5" /> : <Play className="w-3 h-3 mr-1.5" />}
          {autoCycling ? "Stop Auto Cycle" : "Auto Cycle"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map((s, i) => (
          <Button
            key={i}
            onClick={() => onSelect(i)}
            variant="outline"
            size="sm"
            className={cn(
              "text-xs bg-transparent",
              activeScenario === i
                ? "border-white/40 text-white"
                : "border-[#444] text-[#888] hover:text-white"
            )}
          >
            {s.name}
          </Button>
        ))}
      </div>
    </div>
  );
}