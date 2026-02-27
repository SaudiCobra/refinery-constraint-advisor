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
  const size = useBeaconSize();
  const ringThickness = Math.round(size / 32); // scales proportionally (2px at 64, 2.5 at 80, 3 at 96)
  const svgSize = Math.round(size * 0.56);     // inner SVG ~56% of circle diameter
  const svgHeight = Math.round(svgSize * 1.19);

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
            border: `${ringThickness}px solid ${cfg.ringColor}`,
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

        {/* Light-beam SVG — bold lighthouse geometry */}
        <svg
          width={svgSize}
          height={svgHeight}
          viewBox="0 0 32 38"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: "relative", zIndex: 1 }}
        >
          {/* Central vertical pillar — thicker, short */}
          <rect x="13.5" y="22" width="5" height="10" rx="1.5" fill={cfg.beamColor} opacity="0.80" />

          {/* Horizontal base platform */}
          <rect x="9" y="21" width="14" height="2" rx="1" fill={cfg.beamColor} opacity="0.55" />

          {/* Symmetrical triangular beam — wide base, tapers to apex */}
          <path
            d="M3 21 L16 4 L29 21 Z"
            fill={cfg.beamColor}
            opacity="0.90"
          />

          {/* Soft outer ray — left */}
          <path
            d="M16 4 L6 0"
            stroke={cfg.beamColor}
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.28"
          />
          {/* Soft outer ray — right */}
          <path
            d="M16 4 L26 0"
            stroke={cfg.beamColor}
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.28"
          />
        </svg>
      </button>
    </>
  );
}