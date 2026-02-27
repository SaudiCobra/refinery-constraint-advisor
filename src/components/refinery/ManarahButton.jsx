import React, { useState, useEffect } from "react";

function useBeaconSize() {
  const [vw, setVw] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setVw(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  if (vw > 3200) return 96;
  if (vw > 2560) return 80;
  return 64;
}

const STATE_CONFIG = {
  NORMAL: {
    coreColor: "#0F9F9F",
    glowColor: "rgba(15,159,159,0.08)",
    glowIntensity: 1.0,
    haloColor: "rgba(15,159,159,0.06)",
    pulseMs: null,
    sweepMs: null,
    translateY: 0,
  },
  EARLY_DRIFT: {
    coreColor: "#D4A547",
    glowColor: "rgba(212,165,71,0.09)",
    glowIntensity: 1.1,
    haloColor: "rgba(212,165,71,0.07)",
    pulseMs: 5000,
    sweepMs: null,
    translateY: 0,
  },
  SEVERE_DRIFT: {
    coreColor: "#D4653F",
    glowColor: "rgba(212,101,63,0.10)",
    glowIntensity: 1.2,
    haloColor: "rgba(212,101,63,0.12)",
    pulseMs: 3000,
    sweepMs: null,
    translateY: -6,
  },
  IMMEDIATE_RISK: {
    coreColor: "#EF4444",
    glowColor: "rgba(239,68,68,0.12)",
    glowIntensity: 1.35,
    haloColor: "rgba(239,68,68,0.18)",
    pulseMs: null,
    sweepMs: 2500,
    translateY: -6,
  },
};

function resolveState(s) {
  if (!s) return "NORMAL";
  const k = s.toUpperCase().replace(/\s+/g, "_");
  return STATE_CONFIG[k] ? k : "NORMAL";
}

export default function ManarahButton({ systemState, onClick, drawerOpen = false }) {
  const key = resolveState(systemState);
  const cfg = STATE_CONFIG[key];
  const animName = `manarah-ring-${key.toLowerCase()}`;
  const size = useBeaconSize();
  const ringThickness = Math.round(size / 32);
  const svgSize = Math.round(size * 0.56);
  const svgHeight = Math.round(svgSize * 1.19);
  const [vw, setVw] = React.useState(window.innerWidth);
  const translateYPx = Math.round((cfg.translateY / 100) * vw);

  // Drawer positioning constants (from ManarahPanel)
  const basePanelWidth = vw > 3200 ? 760 : vw > 2560 ? 680 : 420;
  const panelWidth = Math.round(basePanelWidth * 1.08);
  const adjustedPanelWidth = Math.round(panelWidth * (key === "IMMEDIATE_RISK" ? 1.18 : 1.0));
  const overlapPx = 20; // Center overlap into drawer

  React.useEffect(() => {
    const handler = () => setVw(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return (
    <>
      <style>{`
        @keyframes ${animName}-breathe {
          0%, 100% { opacity: 0.8; }
          50%       { opacity: 1.0; }
        }
        @keyframes ${animName}-pulse {
          0%, 100% { opacity: 1.0; }
          50%       { opacity: 0.6; }
        }
        @keyframes ${animName}-sweep {
          0%   { transform: rotate(0deg); opacity: 0.4; }
          50%  { opacity: 0.8; }
          100% { transform: rotate(360deg); opacity: 0.4; }
        }
        .manarah-beacon-breathe {
          animation: ${animName}-breathe ${cfg.pulseMs}ms ease-in-out infinite;
        }
        .manarah-beacon-pulse {
          animation: ${animName}-pulse ${cfg.pulseMs}ms ease-in-out infinite;
        }
        .manarah-beacon-sweep {
          animation: ${animName}-sweep ${cfg.sweepMs}ms linear infinite;
        }
      `}</style>

      <button
        onClick={onClick}
        title="Manarah — Advisory Watchtower"
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 9999,
          width: size,
          height: size,
          borderRadius: "50%",
          background: "#141820",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 4px 18px rgba(0,0,0,0.18), 0 0 0 2px rgba(255,255,255,0.04)`,
          outline: "none",
          transform: `translateY(${translateYPx}px)`,
          transition: "transform 0.3s ease-in-out, box-shadow 0.4s ease",
        }}
      >
        {/* Background glow layer */}
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${cfg.glowColor} 0%, transparent 65%)`,
            pointerEvents: "none",
            opacity: cfg.glowIntensity,
            transition: "opacity 0.3s ease-in-out",
          }}
        />

        {/* Halo ring — larger, subtle */}
        <span
          style={{
            position: "absolute",
            inset: -6,
            borderRadius: "50%",
            border: `1px solid ${cfg.haloColor}`,
            pointerEvents: "none",
            opacity: 0.6,
            transition: "opacity 0.3s ease-in-out, border-color 0.3s ease-in-out",
          }}
        />

        {/* Radial sweep effect (Immediate Risk only) */}
        {cfg.sweepMs && (
          <span
            className="manarah-beacon-sweep"
            style={{
              position: "absolute",
              inset: -3,
              borderRadius: "50%",
              border: `2px solid ${cfg.coreColor}`,
              pointerEvents: "none",
              opacity: 0.4,
            }}
          />
        )}

        {/* Minimal geometric beacon: tower + disc + core */}
        <svg
          width={svgSize}
          height={svgHeight}
          viewBox="0 0 32 38"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: "relative", zIndex: 1 }}
        >
          {/* Vertical tower — simple tapered shape */}
          <path
            d="M 12 28 L 14 14 L 18 14 L 20 28 Z"
            stroke={cfg.coreColor}
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Flat circular top disc */}
          <circle cx="16" cy="13" r="8.5" stroke={cfg.coreColor} strokeWidth="1" fill="none" />

          {/* Central light core — main visual anchor */}
          <circle
            cx="16"
            cy="15"
            r="4"
            fill={cfg.coreColor}
            opacity={cfg.pulseMs || cfg.sweepMs ? 0.9 : 0.8}
          />

          {/* Subtle outer halo — static reference */}
          <circle
            cx="16"
            cy="16"
            r="12"
            fill="none"
            stroke={cfg.coreColor}
            strokeWidth="0.6"
            opacity={cfg.sweepMs ? 0.15 : 0.08}
          />
        </svg>

        {/* Breathing animation for Early Drift */}
        {key === "EARLY_DRIFT" && (
          <svg
            className="manarah-beacon-breathe"
            width={svgSize}
            height={svgHeight}
            viewBox="0 0 32 38"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              pointerEvents: "none",
            }}
          >
            <circle
              cx="16"
              cy="15"
              r="4"
              fill={cfg.coreColor}
              opacity="0.3"
            />
          </svg>
        )}

        {/* Pulse animation for Severe Drift */}
        {key === "SEVERE_DRIFT" && (
          <svg
            className="manarah-beacon-pulse"
            width={svgSize}
            height={svgHeight}
            viewBox="0 0 32 38"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              pointerEvents: "none",
            }}
          >
            <circle
              cx="16"
              cy="13"
              r="8.5"
              stroke={cfg.coreColor}
              strokeWidth="1"
              fill="none"
            />
          </svg>
        )}
      </button>
    </>
  );
}