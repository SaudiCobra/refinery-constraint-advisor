import React, { useState, useEffect } from "react";

function useBeaconSize() {
  const [vw, setVw] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setVw(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  if (vw > 3200) return 80;
  if (vw > 2560) return 72;
  return 56;
}

const STATE_CONFIG = {
  NORMAL: {
    coreColor: "#3FC9B0",
    glowColor: "rgba(63,201,176,0.08)",
    glowIntensity: 0.45,
    haloColor: "rgba(63,201,176,0.35)",
    haloBgShadow: "0 0 14px rgba(63,201,176,0.22)",
    pulseMs: null,
    sweepMs: null,
  },
  EARLY_DRIFT: {
    coreColor: "#D9A441",
    glowColor: "rgba(217,164,65,0.10)",
    glowIntensity: 0.55,
    haloColor: "rgba(217,164,65,0.45)",
    haloBgShadow: "0 0 14px rgba(217,164,65,0.30)",
    pulseMs: null,
    sweepMs: 4500,
  },
  SEVERE_DRIFT: {
    coreColor: "#E06A2C",
    glowColor: "rgba(224,106,44,0.12)",
    glowIntensity: 0.75,
    haloColor: "rgba(224,106,44,0.65)",
    haloBgShadow: "0 0 16px rgba(224,106,44,0.40)",
    pulseMs: null,
    sweepMs: 3000,
  },
  IMMEDIATE_RISK: {
    coreColor: "#E14B3B",
    glowColor: "rgba(225,75,59,0.16)",
    glowIntensity: 0.90,
    haloColor: "rgba(225,75,59,0.85)",
    haloBgShadow: "0 0 18px rgba(225,75,59,0.50)",
    pulseMs: null,
    sweepMs: 1400,
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
          background: "linear-gradient(145deg, #141820 0%, #0f1319 100%)",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: docked 
            ? "0 3px 12px rgba(0,0,0,0.16), 0 0 0 1px rgba(255,255,255,0.05), inset 0 0 0 1px rgba(255,255,255,0.04)"
            : "0 6px 22px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.06)",
          backdropFilter: docked ? "blur(4px)" : "none",
          WebkitBackdropFilter: docked ? "blur(4px)" : "none",
          outline: "none",
          transition: "box-shadow 0.25s ease, opacity 0.25s ease, background 0.4s ease",
        }}
        onMouseEnter={(e) => {
          if (!docked) {
            e.currentTarget.style.boxShadow = "0 6px 22px rgba(0,0,0,0.28), 0 0 0 2px rgba(255,255,255,0.05)";
          }
        }}
        onMouseLeave={(e) => {
          if (!docked) {
            e.currentTarget.style.boxShadow = "0 6px 22px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.06)";
          }
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
            opacity: docked ? cfg.glowIntensity * 0.8 : cfg.glowIntensity,
            transition: "opacity 0.25s ease",
          }}
        />

        {/* Halo ring — precision glow */}
        <span
          style={{
            position: "absolute",
            inset: -6,
            borderRadius: "50%",
            border: `1px solid ${cfg.haloColor}`,
            boxShadow: cfg.haloBgShadow,
            pointerEvents: "none",
            opacity: key === "IMMEDIATE_RISK" ? 0.85 : 0.65,
            transition: "opacity 0.3s ease-in-out, border-color 0.35s cubic-bezier(0.32, 0.72, 0.36, 1), box-shadow 0.35s cubic-bezier(0.32, 0.72, 0.36, 1)",
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