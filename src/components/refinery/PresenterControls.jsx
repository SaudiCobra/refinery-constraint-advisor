import React, { useState, useEffect, useRef, useCallback } from "react";
import { SCENARIOS } from "./calcEngine";

// Brief descriptors per scenario index
const SCENARIO_DESCRIPTORS = [
  "All equipment available — no constraint pressure",
  "Temperature accelerating — intervention window open",
  "Effluent cooler offline — response window compressed",
  "Full escalation sequence across all four severity levels",
  "Hydrogen availability decreasing — quench moderation margin narrowing.",
  "Sensor conflict — differentiate noise from true drift",
  "All sensors aligned — confirmed escalation trajectory",
  "Stacked constraints — mitigation headroom reduced",
  "Signal misalignment — no confirmed operational consequence",
  "Rapid TTL compression — intervention window narrowing",
];

// Proximity zone: bottom center ± 220px wide, within 80px of bottom edge
function isInProximityZone(e) {
  const cx = window.innerWidth / 2;
  const fromBottom = window.innerHeight - e.clientY;
  return Math.abs(e.clientX - cx) < 220 && fromBottom < 80;
}

export default function PresenterControls({ presScenario, onSelectScenario, onReset }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [visible, setVisible] = useState(false);   // controls opacity
  const hideTimerRef = useRef(null);
  const total = SCENARIOS.length;

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setPanelOpen(false);
    }, 2500);
  }, []);

  const showStrip = useCallback(() => {
    setVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  // Show on mount (presentation mode first enabled)
  useEffect(() => {
    showStrip();
    return () => clearTimeout(hideTimerRef.current);
  }, []);

  // Show on scenario change
  const prevScenarioRef = useRef(presScenario);
  useEffect(() => {
    if (prevScenarioRef.current !== presScenario) {
      prevScenarioRef.current = presScenario;
      showStrip();
    }
  }, [presScenario, showStrip]);

  // Mouse proximity detection
  useEffect(() => {
    const onMouseMove = (e) => {
      if (isInProximityZone(e)) {
        setVisible(true);
        clearTimeout(hideTimerRef.current);
      } else if (visible) {
        scheduleHide();
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [visible, scheduleHide]);

  const prev = useCallback(() => {
    if (!total) return;
    onSelectScenario(Math.max(0, (presScenario - 1 + total) % total));
  }, [presScenario, total, onSelectScenario]);

  const next = useCallback(() => {
    if (!total) return;
    onSelectScenario(Math.min(total - 1, (presScenario + 1) % total));
  }, [presScenario, total, onSelectScenario]);

  // Keyboard navigation — only in presentation mode (this component is mounted only then)
  useEffect(() => {
    const ARROW_KEYS = new Set(["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"]);
    const onKeyDown = (e) => {
      if (!ARROW_KEYS.has(e.key)) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable) return;
      e.preventDefault();
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next();
      else prev();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [prev, next]);

  const scenarioName = SCENARIOS[presScenario]?.name || `Scenario ${presScenario + 1}`;
  // Strip leading number prefix for strip display (e.g. "1. Stable Baseline" → "Stable Baseline")
  const shortName = scenarioName.replace(/^\d+\.\s*/, "");

  return (
    <>
      {/* Dim backdrop */}
      {panelOpen && (
        <div
          onClick={() => setPanelOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 9991,
          }}
        />
      )}

      {/* Scenario jump panel */}
      {panelOpen && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 520,
            maxHeight: "70vh",
            overflowY: "auto",
            padding: "22px 26px",
            background: "#0F141B",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 16,
            boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
            zIndex: 9992,
          }}
        >
          <p style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 18 }}>
            Select Scenario
          </p>
          {SCENARIOS.map((s, idx) => {
            const isActive = idx === presScenario;
            const label = s.name.replace(/^\d+\.\s*/, "");
            const descriptor = SCENARIO_DESCRIPTORS[idx] || "";
            return (
              <ScenarioRow
                key={idx}
                label={label}
                descriptor={descriptor}
                active={isActive}
                onClick={() => { onSelectScenario(idx); setPanelOpen(false); }}
              />
            );
          })}
        </div>
      )}

      {/* Fixed bottom strip */}
      <div
        style={{
          position: "fixed",
          bottom: 28,
          left: "50%",
          transform: "translateX(-50%)",
          opacity: visible ? 0.95 : 0,
          pointerEvents: visible ? "auto" : "none",
          transition: visible ? "opacity 180ms ease" : "opacity 220ms ease",
          display: "flex",
          alignItems: "center",
          padding: "10px 18px",
          borderRadius: 999,
          background: "rgba(20,24,32,0.85)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          zIndex: 9990,
          whiteSpace: "nowrap",
          gap: 0,
        }}
      >
        <StripButton onClick={prev} label="◀" />

        <button
          onClick={() => setPanelOpen(p => !p)}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.85)",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.01em",
            padding: "0 14px",
            minWidth: 160,
            textAlign: "center",
            cursor: "pointer",
            opacity: panelOpen ? 1 : 0.85,
            transition: "opacity 0.15s",
          }}
        >
          {shortName}
        </button>

        <StripButton onClick={next} label="▶" />

        {onReset && (
          <>
            <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)", margin: "0 8px" }} />
            <StripButton onClick={onReset} label="↺" title="Reset to Stable Baseline" />
          </>
        )}
      </div>
    </>
  );
}

function StripButton({ onClick, label }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "transparent",
        border: "none",
        color: hovered ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.35)",
        fontSize: 16,
        cursor: "pointer",
        padding: "2px 10px",
        lineHeight: 1,
        transition: "color 0.15s",
        userSelect: "none",
      }}
    >
      {label}
    </button>
  );
}

function ScenarioRow({ label, descriptor, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "13px 14px",
        borderRadius: 10,
        cursor: "pointer",
        marginBottom: 4,
        background: active
          ? "rgba(255,255,255,0.06)"
          : hovered
          ? "rgba(255,255,255,0.04)"
          : "transparent",
        borderLeft: active ? "2px solid rgba(255,255,255,0.25)" : "2px solid transparent",
        transition: "background 0.15s",
      }}
    >
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.75)" }}>
        {label}
      </p>
      {descriptor && (
        <p style={{ margin: "3px 0 0", fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>
          {descriptor}
        </p>
      )}
    </div>
  );
}