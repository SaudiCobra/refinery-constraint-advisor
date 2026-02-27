import React from "react";

const STATE_CONFIG = {
  NORMAL: {
    ringColor: "rgba(15,159,159,0.25)",
    beamColor: "#0F9F9F",
    glowColor: "rgba(15,159,159,0.12)",
    pulseMs: null,
  },
  EARLY_DRIFT: {
    ringColor: "rgba(212,165,71,0.45)",
    beamColor: "#D4A547",
    glowColor: "rgba(212,165,71,0.14)",
    pulseMs: 3000,
  },
  SEVERE_DRIFT: {
    ringColor: "rgba(212,101,63,0.65)",
    beamColor: "#D4653F",
    glowColor: "rgba(212,101,63,0.16)",
    pulseMs: 1500,
  },
  IMMEDIATE_RISK: {
    ringColor: "rgba(239,68,68,0.85)",
    beamColor: "#EF4444",
    glowColor: "rgba(239,68,68,0.14)",
    pulseMs: 700,
  },
};

function resolveState(s) {
  if (!s) return "NORMAL";
  const k = s.toUpperCase().replace(/\s+/g, "_");
  return STATE_CONFIG[k] ? k : "NORMAL";
}

export default function ManarahButton({ systemState, onClick }) {
  const key = resolveState(systemState);
  const cfg = STATE_CONFIG[key];
  const animName = `manarah-ring-${key.toLowerCase()}`;

  return (
    <>
      <style>{`
        @keyframes ${animName} {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(1.18); }
        }
        .manarah-ring-pulse {
          animation: ${animName} ${cfg.pulseMs}ms ease-in-out infinite;
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
          width: 64,
          height: 64,
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
          transition: "box-shadow 0.4s ease",
        }}
      >
        {/* Outer ring — animated */}
        <span
          className={cfg.pulseMs ? "manarah-ring-pulse" : ""}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `2px solid ${cfg.ringColor}`,
            pointerEvents: "none",
          }}
        />

        {/* Radial glow behind beam */}
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: `radial-gradient(circle at 50% 55%, ${cfg.glowColor} 0%, transparent 72%)`,
            pointerEvents: "none",
          }}
        />

        {/* Light-beam SVG — abstract tapered vertical beam, no emoji */}
        <svg
          width="26"
          height="30"
          viewBox="0 0 26 30"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: "relative", zIndex: 1 }}
        >
          {/* Narrow base stem */}
          <rect x="11.5" y="18" width="3" height="8" rx="1" fill={cfg.beamColor} opacity="0.75" />

          {/* Tapered mid-body */}
          <path
            d="M10 10 L13 2 L16 10 Z"
            fill={cfg.beamColor}
            opacity="0.90"
          />

          {/* Soft beam spread above apex — two faint outer rays */}
          <path
            d="M13 2 L8 0"
            stroke={cfg.beamColor}
            strokeWidth="0.8"
            strokeLinecap="round"
            opacity="0.30"
          />
          <path
            d="M13 2 L18 0"
            stroke={cfg.beamColor}
            strokeWidth="0.8"
            strokeLinecap="round"
            opacity="0.30"
          />

          {/* Horizontal base bar */}
          <rect x="8.5" y="17" width="9" height="1.5" rx="0.75" fill={cfg.beamColor} opacity="0.55" />
        </svg>
      </button>
    </>
  );
}