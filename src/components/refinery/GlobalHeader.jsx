import React from "react";
import { cn } from "@/lib/utils";
import { Sun, Moon } from "lucide-react";
import moment from "moment";
import { useTheme } from "@/components/ThemeContext";

export default function GlobalHeader({ displayMode, onModeChange, alarmsOnly, onAlarmsOnlyChange }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className={cn(
      "border-b px-6 py-4 transition-colors duration-300",
      isLight ? "bg-white border-[#d1d5db]" : "bg-[#161616] border-[#2a2a2a]"
    )}>
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left */}
        <div>
          <h1 className={cn("text-xl font-bold tracking-normal transition-colors duration-300",
            isLight ? "text-[#111827]" : "text-white")}>
            Manarah
          </h1>
          <p className={cn("text-sm font-normal tracking-tight transition-colors duration-300",
            isLight ? "text-[#4b5563]" : "text-[#aaa]")}>
            Operating Limits Watchtower
          </p>
          {displayMode === "interactive" && (
            <div className="flex items-center gap-3 mt-2">
              <span className={cn("text-sm transition-colors duration-300",
                isLight ? "text-[#6b7280]" : "text-[#888]")}>Unit: NHT Preheat Section</span>
              <span className={cn("transition-colors duration-300",
                isLight ? "text-[#9ca3af]" : "text-[#555]")}>|</span>
              <span className={cn("text-sm transition-colors duration-300",
                isLight ? "text-[#6b7280]" : "text-[#888]")}>Assessment as of: {moment().format("HH:mm")}</span>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">

            {/* Light / Dark Toggle */}
            <button
              onClick={toggleTheme}
              className={cn(
                "flex items-center gap-1.5 px-3 py-[7px] rounded-lg border text-xs font-medium tracking-wide transition-all duration-300",
                isLight
                  ? "bg-[#f0f2f7] border-[#d1d5db] text-[#4b5563] hover:bg-[#e5e9f0] hover:border-[#b0b8c8]"
                  : "bg-[#222] border-[#333] text-[#888] hover:text-white hover:border-[#555]"
              )}
              title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {isLight
                ? <Moon className="w-3.5 h-3.5" />
                : <Sun className="w-3.5 h-3.5" />
              }
              <span>{isLight ? "DARK" : "LIGHT"}</span>
            </button>

            {/* Display Mode Toggle */}
            <div className={cn(
              "flex rounded-lg border overflow-hidden transition-colors duration-300",
              isLight ? "bg-[#f0f2f7] border-[#d1d5db]" : "bg-[#222] border-[#333]"
            )}>
              <button
                onClick={() => onModeChange("interactive")}
                className={cn(
                  "px-5 py-2 text-sm font-medium tracking-wide transition-all duration-200",
                  displayMode === "interactive"
                    ? isLight ? "bg-[#111827] text-white" : "bg-white text-[#111]"
                    : isLight ? "text-[#6b7280] hover:text-[#111827]" : "text-[#777] hover:text-white"
                )}
              >
                INTERACTIVE
              </button>
              <button
                onClick={() => onModeChange("presentation")}
                className={cn(
                  "px-5 py-2 text-sm font-medium tracking-wide transition-all duration-200",
                  displayMode === "presentation"
                    ? isLight ? "bg-[#111827] text-white" : "bg-white text-[#111]"
                    : isLight ? "text-[#6b7280] hover:text-[#111827]" : "text-[#777] hover:text-white"
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
                  "w-10 h-5 rounded-full border transition-all duration-300 flex items-center px-0.5",
                  alarmsOnly
                    ? "bg-amber-600 border-amber-500"
                    : isLight ? "bg-[#e5e7eb] border-[#d1d5db]" : "bg-[#333] border-[#555]"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full bg-white transition-transform duration-300",
                  alarmsOnly && "translate-x-5"
                )} />
              </div>
              <span className={cn("text-xs transition-colors duration-300",
                isLight ? "text-[#6b7280]" : "text-[#888]")}>DCS Alarm View</span>
            </label>
          </div>

          <p className={cn("text-xs italic transition-colors duration-300",
            isLight ? "text-[#9ca3af]" : "text-[#555]")}>
            Advisory only — operator retains control.
          </p>
        </div>
      </div>
    </div>
  );
}