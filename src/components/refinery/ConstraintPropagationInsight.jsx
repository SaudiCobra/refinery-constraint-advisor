import React from "react";
import { InfoIcon } from "lucide-react";

const INSIGHT_CONFIG = {
  EARLY_DRIFT: {
    title: "Constraint propagation detected",
    text: "Temperature rise at the reactor inlet is propagating downstream. The system is tracking the path and projecting time to limit.",
  },
  SEVERE_DRIFT: {
    title: "Constraint approaching operational limit",
    text: "Reactor inlet temperature trajectory indicates the constraint is developing along the E-1 → Reactor path.",
  },
  IMMEDIATE_RISK: {
    title: "Constraint reached critical margin",
    text: "If unchanged, the constraint will reach limit conditions. Corrective actions can extend operating margin.",
  },
};

export default function ConstraintPropagationInsight({ systemState }) {
  const isVisible = ["EARLY_DRIFT", "SEVERE_DRIFT", "IMMEDIATE_RISK"].includes(systemState);
  const config = INSIGHT_CONFIG[systemState];

  if (!isVisible || !config) {
    return null;
  }

  return (
    <div
      className="absolute top-6 right-6 max-w-xs bg-[#0D1117] border border-[#333] rounded-lg p-4 shadow-lg transition-all duration-500"
      style={{
        animation: "fadeIn 0.6s ease-out",
        backdropFilter: "blur(8px)",
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="flex gap-3">
        <InfoIcon className="w-5 h-5 flex-shrink-0 text-[#888] mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-[#ccc] mb-1.5">
            {config.title}
          </h4>
          <p className="text-xs text-[#999] leading-relaxed">
            {config.text}
          </p>
        </div>
      </div>
    </div>
  );
}