import React from "react";
import { cn } from "@/lib/utils";

export default function MitigationCapacity({ escalationLevel, timeToNearest }) {
  // Derive mitigation capacity from escalation severity and time-to-constraint
  const getMitigationCapacity = () => {
    // Time override rules (highest priority)
    if (timeToNearest <= 5) {
      return "CRITICAL";
    }
    if (timeToNearest <= 10 && escalationLevel >= 2) {
      return "CRITICAL";
    }

    // Escalation level mapping
    if (escalationLevel >= 3) {
      return "CRITICAL";
    }
    if (escalationLevel === 2) {
      return "SEVERELY_LIMITED";
    }
    if (escalationLevel === 1) {
      return "LIMITED";
    }
    return "AVAILABLE";
  };

  const capacity = getMitigationCapacity();

  const config = {
    AVAILABLE: {
      color: "#2F5D80",
      label: "AVAILABLE",
      message: "Multiple corrective levers effective.",
    },
    LIMITED: {
      color: "#B47A1F",
      label: "LIMITED",
      message: "Some corrective flexibility remains.",
    },
    SEVERELY_LIMITED: {
      color: "#A13A1F",
      label: "SEVERELY LIMITED",
      message: "Only high-impact interventions remain.",
    },
    CRITICAL: {
      color: "#7A0F0F",
      label: "CRITICAL",
      message: "Mitigation capacity nearly exhausted.",
    },
  };

  const current = config[capacity];

  return (
    <div className="bg-[#1e1e1e] border border-[#333] rounded-lg px-5 py-3">
      <div className="flex items-center gap-3">
        <span className="text-[#666] text-xs uppercase tracking-wider font-semibold">
          Mitigation Capacity:
        </span>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: current.color }} />
          <span className="text-sm font-semibold" style={{ color: current.color }}>
            {current.label}
          </span>
        </div>
      </div>
      <p className="text-xs italic text-[#888] mt-1">{current.message}</p>
    </div>
  );
}