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
    pulseMs: null,
    sweepMs: null,
    translateY: 0,
  },
  SEVERE_DRIFT: {
    coreColor: "#D4653F",
    glowColor: "rgba(212,101,63,0.10)",
    glowIntensity: 1.2,
    haloColor: "rgba(212,101,63,0.12)",
    pulseMs: null,
    sweepMs: 3000,
    translateY: -6,
  },
  IMMEDIATE_RISK: {
    coreColor: "#EF4444",
    glowColor: "rgba(239,68,68,0.12)",
    glowIntensity: 1.35,
    haloColor: "rgba(239,68,68,0.18)",
    pulseMs: 900,
    sweepMs: 1400,
    translateY: -6,
  },
};

function resolveState(s) {
  if (!s) return "NORMAL";
  const k = s.toUpperCase().replace(/\s+/g, "_");
  return STATE_CONFIG[k] ? k : "NORMAL";
}

export default function ManarahButton({ systemState, onClick, drawerOpen = false, docked = false }) {
  const key = resolveState(systemState);
  const cfg = STATE_CONFIG[key];
  const animName = `manarah-ring-${key.toLowerCase()}`;
  const size = useBeaconSize();
  const ringThickness = Math.round(size / 32);
  const svgSize = Math.round(size * 0.56);
  const svgHeight = Math.round(svgSize * 1.19);

  return (
    <>
      <style>{`
        @keyframes ${animName}-core-pulse {
          0%, 100% { opacity: 0.75; }
          50%       { opacity: 0.95; }
        }
        @keyframes ${animName}-sweep-rotate {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .manarah-beacon-core-pulse {
          animation: ${animName}-core-pulse ${cfg.pulseMs}ms ease-in-out infinite;
        }
        .manarah-beacon-sweep-rotate {
          animation: ${animName}-sweep-rotate ${cfg.sweepMs}ms linear infinite;
        }
      `}</style>

      <button
        onClick={onClick}
        title={docked ? "Close Manarah Panel" : "Manarah — Advisory Watchtower"}
        style={{
          position: docked ? "absolute" : "fixed",
          ...(docked ? { top: 12, right: 12, zIndex: 10000 } : { bottom: 20, right: 20, zIndex: 9999 }),
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
            opacity: key === "IMMEDIATE_RISK" ? 0.85 : 0.6,
            transition: "opacity 0.3s ease-in-out, border-color 0.3s ease-in-out",
          }}
        />

        {/* Beacon sweep effect for Severe & Immediate */}
        {cfg.sweepMs && (
          <svg
            className="manarah-beacon-sweep-rotate"
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
            <defs>
              <filter id={`${animName}-sweep-blur`}>
                <feGaussianBlur in="SourceGraphic" stdDeviation={key === "IMMEDIATE_RISK" ? "10" : "11"} />
              </filter>
            </defs>
            {/* Sweep cone originating from top-center (lens direction) */}
            <path
              d="M 16 13 L 12 1 L 20 1 Z"
              fill={cfg.coreColor}
              opacity={key === "IMMEDIATE_RISK" ? 0.22 : 0.15}
              filter={`url(#${animName}-sweep-blur)`}
            />
          </svg>
        )}

        {/* Minimal geometric beacon: tower + disc + core + ring */}
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

          {/* Status ring — thicker for Immediate Risk */}
          <circle
            cx="16"
            cy="13"
            r="8.5"
            stroke={cfg.coreColor}
            strokeWidth={key === "IMMEDIATE_RISK" ? "1.5" : "1"}
            fill="none"
            opacity={0.7}
          />

          {/* Central light core — pulse for Immediate Risk */}
          <circle
            cx="16"
            cy="15"
            r="4"
            fill={cfg.coreColor}
            className={key === "IMMEDIATE_RISK" ? "manarah-beacon-core-pulse" : ""}
            opacity={key === "IMMEDIATE_RISK" ? 0.85 : key === "SEVERE_DRIFT" ? 0.9 : 0.8}
            style={{ opacity: key === "IMMEDIATE_RISK" ? undefined : (key === "SEVERE_DRIFT" ? 0.9 : 0.8) }}
          />

          {/* Subtle outer halo — stronger for Immediate Risk */}
          <circle
            cx="16"
            cy="16"
            r="12"
            fill="none"
            stroke={cfg.coreColor}
            strokeWidth="0.6"
            opacity={key === "IMMEDIATE_RISK" ? 0.12 : 0.08}
          />
        </svg>
      </button>
    </>
  );
}