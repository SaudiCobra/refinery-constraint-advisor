import React from "react";
import moment from "moment";
import { Sun, Moon } from "lucide-react";

export default function GlobalHeader({ displayMode, onModeChange, alarmsOnly, onAlarmsOnlyChange, theme = "dark", onThemeToggle }) {
  const isLight = theme === "light";

  return (
    <div style={{
      background: "var(--t-bg-header)",
      borderBottom: "1px solid var(--t-border)",
      padding: "16px 24px",
      transition: "background-color 300ms ease, border-color 300ms ease",
    }}>
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left */}
        <div>
          <h1 style={{ color: "var(--t-text-1)", fontSize: "1.2rem", fontWeight: 700, letterSpacing: "normal", transition: "color 300ms ease" }}>
            Manarah
          </h1>
          <p style={{ color: "var(--t-text-2)", fontSize: "0.875rem", fontWeight: 400, transition: "color 300ms ease" }}>
            Operating Limits Watchtower
          </p>
          {displayMode === "interactive" && (
            <div className="flex items-center gap-3 mt-2">
              <span style={{ color: "var(--t-text-3)", fontSize: "0.875rem", transition: "color 300ms ease" }}>Unit: NHT Preheat Section</span>
              <span style={{ color: "var(--t-border-sub)", transition: "color 300ms ease" }}>|</span>
              <span style={{ color: "var(--t-text-3)", fontSize: "0.875rem", transition: "color 300ms ease" }}>Assessment as of: {moment().format("HH:mm")}</span>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={onThemeToggle}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 13px",
                borderRadius: 8,
                border: "1px solid var(--t-border)",
                background: "var(--t-bg-elevated)",
                color: "var(--t-text-2)",
                fontSize: "0.72rem",
                fontWeight: 500,
                cursor: "pointer",
                letterSpacing: "0.06em",
                transition: "all 300ms ease",
              }}
            >
              {isLight ? <Moon size={13} /> : <Sun size={13} />}
              <span>{isLight ? "DARK" : "LIGHT"}</span>
            </button>

            {/* Display Mode Toggle */}
            <div style={{
              display: "flex",
              background: "var(--t-bg-elevated)",
              borderRadius: 8,
              border: "1px solid var(--t-border)",
              overflow: "hidden",
              transition: "background-color 300ms ease, border-color 300ms ease",
            }}>
              <button
                onClick={() => onModeChange("interactive")}
                style={{
                  padding: "8px 20px",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                  border: "none",
                  transition: "all 300ms ease",
                  background: displayMode === "interactive"
                    ? (isLight ? "#0f172a" : "#ffffff")
                    : "transparent",
                  color: displayMode === "interactive"
                    ? (isLight ? "#ffffff" : "#111111")
                    : "var(--t-text-3)",
                }}
              >
                INTERACTIVE
              </button>
              <button
                onClick={() => onModeChange("presentation")}
                style={{
                  padding: "8px 20px",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                  border: "none",
                  transition: "all 300ms ease",
                  background: displayMode === "presentation"
                    ? (isLight ? "#0f172a" : "#ffffff")
                    : "transparent",
                  color: displayMode === "presentation"
                    ? (isLight ? "#ffffff" : "#111111")
                    : "var(--t-text-3)",
                }}
              >
                PRESENTATION
              </button>
            </div>

            {/* Alarms-only Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => onAlarmsOnlyChange(!alarmsOnly)}
                style={{
                  width: 40,
                  height: 20,
                  borderRadius: 10,
                  border: `1px solid ${alarmsOnly ? "#d97706" : "var(--t-border)"}`,
                  background: alarmsOnly ? "#d97706" : "var(--t-bg-elevated)",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 2px",
                  cursor: "pointer",
                  transition: "all 300ms ease",
                }}
              >
                <div style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "#ffffff",
                  transform: alarmsOnly ? "translateX(20px)" : "translateX(0px)",
                  transition: "transform 300ms ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }} />
              </div>
              <span style={{ color: "var(--t-text-3)", fontSize: "0.75rem", transition: "color 300ms ease" }}>DCS Alarm View</span>
            </label>
          </div>

          <p style={{ color: "var(--t-text-4)", fontSize: "0.7rem", fontStyle: "italic", transition: "color 300ms ease" }}>
            Advisory only — operator retains control.
          </p>
        </div>
      </div>
    </div>
  );
}