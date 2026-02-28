import React, { useState } from "react";
import ScenarioSelector from "./ScenarioSelector";
import { DEMONSTRATION_STAGES } from "./calcEngine";

export default function PresenterControls({
  presScenario,
  onSelectScenario,
  autoCycling,
  onToggleAutoCycle,
  demonstrationActive,
  demonstrationStage,
  onStartDemonstration,
  onStopDemonstration,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 8 }}>
      <button
        onClick={() => setExpanded(p => !p)}
        style={{
          background: "transparent",
          border: "1px solid #2a2a2a",
          color: "#444",
          fontSize: 11,
          letterSpacing: "0.06em",
          padding: "5px 16px",
          borderRadius: 6,
          cursor: "pointer",
          textTransform: "uppercase",
          transition: "border-color 0.2s, color 0.2s",
        }}
        onMouseEnter={e => { e.target.style.borderColor = "#444"; e.target.style.color = "#888"; }}
        onMouseLeave={e => { e.target.style.borderColor = "#2a2a2a"; e.target.style.color = "#444"; }}
      >
        {expanded ? "▲ Hide controls" : "▼ Presenter controls"}
      </button>

      {expanded && (
        <div style={{ marginTop: 12, width: "100%", maxWidth: 700 }}>
          {!demonstrationActive && (
            <ScenarioSelector
              activeScenario={presScenario}
              onSelect={onSelectScenario}
              autoCycling={autoCycling}
              onToggleAutoCycle={onToggleAutoCycle}
            />
          )}

          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12 }}>
            {!demonstrationActive ? (
              <button
                onClick={onStartDemonstration}
                style={{
                  padding: "10px 22px",
                  background: "#0F5F5F",
                  border: "1px solid #0F9F9F",
                  borderRadius: 8,
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                ▶ Run Full Operational Demonstration
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ padding: "10px 18px", background: "#1e1e1e", border: "1px solid #444", borderRadius: 8 }}>
                  <p style={{ color: "#0F9F9F", fontSize: 13, fontWeight: 600, margin: 0 }}>
                    Stage {demonstrationStage + 1} of {DEMONSTRATION_STAGES.length}: {DEMONSTRATION_STAGES[demonstrationStage]?.name}
                  </p>
                  <p style={{ color: "#888", fontSize: 11, marginTop: 4, fontStyle: "italic", margin: "4px 0 0" }}>
                    {DEMONSTRATION_STAGES[demonstrationStage]?.message}
                  </p>
                </div>
                <button
                  onClick={onStopDemonstration}
                  style={{
                    padding: "10px 18px",
                    background: "#3a1010",
                    border: "1px solid #7A0F0F",
                    borderRadius: 8,
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  ■ Stop
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}