import React from "react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function GlobalHeader({ displayMode, onModeChange, alarmsOnly, onAlarmsOnlyChange }) {
  return (
    <div className="bg-[#161616] border-b border-[#2a2a2a] px-6 py-4">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left */}
        <div>
          <h1 className="text-white text-xl font-bold tracking-normal">
            Manarah
          </h1>
          <p className="text-[#aaa] text-sm font-normal tracking-tight">
            Operating Limits Watchtower (NHT)
          </p>
          {displayMode === "interactive" && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[#888] text-sm">Unit: NHT Preheat Section (Demo)</span>
              <span className="text-[#555]">|</span>
              <span className="text-[#888] text-sm">Assessment as of: {moment().format("HH:mm")}</span>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-4">
            {/* Display Mode Toggle */}
            <div className="flex bg-[#222] rounded-lg border border-[#333] overflow-hidden">
              <button
                onClick={() => onModeChange("interactive")}
                className={cn(
                  "px-5 py-2 text-sm font-medium tracking-wide transition-all",
                  displayMode === "interactive"
                    ? "bg-white text-[#111]"
                    : "text-[#777] hover:text-white"
                )}
              >
                INTERACTIVE
              </button>
              <button
                onClick={() => onModeChange("presentation")}
                className={cn(
                  "px-5 py-2 text-sm font-medium tracking-wide transition-all",
                  displayMode === "presentation"
                    ? "bg-white text-[#111]"
                    : "text-[#777] hover:text-white"
                )}
              >
                PRESENTATION
              </button>
            </div>

            {/* Alarms-only Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => onAlarmsOnlyChange(!alarmsOnly)}
                className={cn(
                  "w-10 h-5 rounded-full border transition-all flex items-center px-0.5",
                  alarmsOnly ? "bg-amber-600 border-amber-500" : "bg-[#333] border-[#555]"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full bg-white transition-transform",
                  alarmsOnly && "translate-x-5"
                )} />
              </div>
              <span className="text-[#888] text-xs">Alarms-only View</span>
            </label>
          </div>

          <p className="text-[#555] text-xs italic">Advisory only — operator retains control.</p>
        </div>
      </div>
    </div>
  );
}