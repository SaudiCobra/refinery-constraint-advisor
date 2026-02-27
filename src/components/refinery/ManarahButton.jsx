import React from "react";
import { cn } from "@/lib/utils";

const STATE_CONFIG = {
  NORMAL: {
    ring: "ring-[#1a3a3a]",
    bg: "bg-[#0F2F2F]",
    glow: "shadow-[0_0_10px_2px_rgba(15,159,159,0.15)]",
    pulse: null,
    iconColor: "#0F9F9F",
  },
  EARLY_DRIFT: {
    ring: "ring-[#7A5A1F]",
    bg: "bg-[#2a1f08]",
    glow: "shadow-[0_0_14px_3px_rgba(212,165,71,0.25)]",
    pulse: "manarah-pulse-slow",
    iconColor: "#D4A547",
  },
  SEVERE_DRIFT: {
    ring: "ring-[#9A3A1F]",
    bg: "bg-[#2a1008]",
    glow: "shadow-[0_0_18px_4px_rgba(212,101,63,0.35)]",
    pulse: "manarah-pulse-medium",
    iconColor: "#D4653F",
  },
  IMMEDIATE_RISK: {
    ring: "ring-[#cc2222]",
    bg: "bg-[#2a0808]",
    glow: "shadow-[0_0_22px_5px_rgba(220,50,50,0.45)]",
    pulse: "manarah-pulse-fast",
    iconColor: "#EF4444",
  },
};

// Map display state names → config keys
function resolveState(systemState) {
  if (!systemState) return "NORMAL";
  const s = systemState.toUpperCase().replace(/\s+/g, "_");
  return STATE_CONFIG[s] ? s : "NORMAL";
}

export default function ManarahButton({ systemState, onClick }) {
  const key = resolveState(systemState);
  const cfg = STATE_CONFIG[key];

  return (
    <>
      <style>{`
        @keyframes manarah-slow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.07); opacity: 0.85; }
        }
        @keyframes manarah-medium {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.10); opacity: 0.80; }
        }
        @keyframes manarah-fast {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.13); opacity: 0.75; }
        }
        .manarah-pulse-slow   { animation: manarah-slow   3s ease-in-out infinite; }
        .manarah-pulse-medium { animation: manarah-medium 1.5s ease-in-out infinite; }
        .manarah-pulse-fast   { animation: manarah-fast  0.7s ease-in-out infinite; }
      `}</style>

      <button
        onClick={onClick}
        title="Manarah"
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "w-13 h-13 rounded-full",
          "flex items-center justify-center",
          "border border-[#333]",
          "ring-2",
          cfg.ring,
          cfg.bg,
          cfg.glow,
          cfg.pulse,
          "transition-all duration-500"
        )}
        style={{ width: 52, height: 52 }}
      >
        {/* Manarah (watchtower/lighthouse) SVG icon */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Tower base */}
          <rect x="9" y="14" width="6" height="7" rx="0.5" fill={cfg.iconColor} opacity="0.9" />
          {/* Tower body */}
          <path d="M8 8 L10 14 H14 L16 8 Z" fill={cfg.iconColor} opacity="0.85" />
          {/* Tower top / parapet */}
          <rect x="7" y="6" width="10" height="2.5" rx="0.5" fill={cfg.iconColor} />
          {/* Beacon light */}
          <circle cx="12" cy="4" r="1.8" fill={cfg.iconColor} opacity="0.95" />
          {/* Light rays */}
          <line x1="12" y1="1.5" x2="12" y2="0.5" stroke={cfg.iconColor} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
          <line x1="14.2" y1="2.2" x2="15" y2="1.4" stroke={cfg.iconColor} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
          <line x1="9.8" y1="2.2" x2="9" y2="1.4" stroke={cfg.iconColor} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
          {/* Door */}
          <rect x="10.5" y="17" width="3" height="4" rx="1.5" fill={cfg.bg} />
        </svg>
      </button>
    </>
  );
}