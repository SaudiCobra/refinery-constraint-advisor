import React from "react";
import { SCENARIOS } from "./calcEngine";

export default function PresenterControls({ presScenario, onSelectScenario }) {
  const total = SCENARIOS.length;
  const scenarioName = SCENARIOS[presScenario]?.name || `Scenario ${presScenario + 1}`;

  const prev = () => onSelectScenario((presScenario - 1 + total) % total);
  const next = () => onSelectScenario((presScenario + 1) % total);

  const btnStyle = (hovered) => ({
    background: "transparent",
    border: "none",
    color: hovered ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.35)",
    fontSize: 16,
    cursor: "pointer",
    padding: "2px 10px",
    lineHeight: 1,
    transition: "color 0.15s",
    userSelect: "none",
  });

  const [prevHover, setPrevHover] = React.useState(false);
  const [nextHover, setNextHover] = React.useState(false);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "10px 18px",
        borderRadius: 999,
        background: "rgba(20,24,32,0.85)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 9990,
        whiteSpace: "nowrap",
      }}
    >
      <button
        onClick={prev}
        style={btnStyle(prevHover)}
        onMouseEnter={() => setPrevHover(true)}
        onMouseLeave={() => setPrevHover(false)}
      >
        ◀
      </button>

      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "rgba(255,255,255,0.85)",
          letterSpacing: "0.01em",
          padding: "0 12px",
          minWidth: 160,
          textAlign: "center",
        }}
      >
        {scenarioName}
      </span>

      <button
        onClick={next}
        style={btnStyle(nextHover)}
        onMouseEnter={() => setNextHover(true)}
        onMouseLeave={() => setNextHover(false)}
      >
        ▶
      </button>
    </div>
  );
}