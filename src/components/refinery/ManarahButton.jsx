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

        {/* Light-beam SVG — tower + crown + beam */}
        <svg
          width={svgSize}
          height={svgHeight}
          viewBox="0 0 32 38"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: "relative", zIndex: 1 }}
        >
          <defs>
            {/* Gradient for beam glow — bright center, fades outward */}
            <radialGradient id="beamGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={cfg.beamColor} stopOpacity={cfg.pulseMs ? "0.75" : "0.70"} />
              <stop offset="100%" stopColor={cfg.beamColor} stopOpacity="0.10" />
            </radialGradient>
          </defs>

          {/* Base tower — slim, tapered upward (18% width → narrower at top) */}
          <path
            d="M 11 28 L 13 16 L 19 16 L 21 28 Z"
            fill={cfg.beamColor}
            opacity="0.85"
          />

          {/* Crown — thin circular disc on top */}
          <circle cx="16" cy="15" r="10" fill={cfg.beamColor} opacity="0.75" />

          {/* Light beam — upward triangle with gradient, wide base at crown */}
          <path
            d="M 5.6 15 L 16 -8 L 26.4 15 Z"
            fill="url(#beamGlow)"
            opacity={cfg.pulseMs ? 0.85 : 0.75}
          />

          {/* Soft outer halo glow around beacon */}
          <circle
            cx="16"
            cy="16"
            r="15"
            fill="none"
            stroke={cfg.beamColor}
            strokeWidth="0.8"
            opacity={cfg.pulseMs ? 0.18 : 0.10}
          />
        </svg>
      </button>
    </>
  );
}