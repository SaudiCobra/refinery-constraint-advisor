import React, { useState } from "react";
import { cn } from "@/lib/utils";

const LEVEL_COLORS = {
  0: "#0F5F5F",
  1: "#B47A1F",
  2: "#A13A1F",
  3: "#7A0F0F",
};

const COOLING_COLORS = {
  NORMAL: "#2F5D80",
  REDUCED: "#B47A1F",
  CONSTRAINED: "#A13A1F",
};

export default function ProcessMap({
  escalationLevel,
  slope,
  currentTemp,
  feedFlow,
  equipment,
  preheatActive,
  preheatStatus,
  coolingCapacity,
  nearest,
  timeToNearest,
  interactive = true,
  units = "°C",
}) {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const baseColor = LEVEL_COLORS[escalationLevel] || LEVEL_COLORS[0];
  const coolerColor = COOLING_COLORS[coolingCapacity] || COOLING_COLORS.NORMAL;
  const animationSpeed = escalationLevel === 0 ? "8s" : escalationLevel === 1 ? "6s" : escalationLevel === 2 ? "4s" : "3s";

  const preheatColor = preheatActive && preheatStatus?.includes("Stress") ? "#A13A1F" 
    : preheatActive && preheatStatus?.includes("Warning") ? "#B47A1F" 
    : "#0F5F5F";

  const handleUnitClick = (unit) => {
    if (!interactive) return;
    setSelectedUnit(selectedUnit === unit ? null : unit);
  };

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 relative">
      <svg viewBox="0 0 1200 400" className="w-full h-auto">
        <defs>
          {/* Animated flow gradient */}
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={baseColor} stopOpacity="0">
              <animate attributeName="offset" values="0;1;0" dur={animationSpeed} repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor={baseColor} stopOpacity="1">
              <animate attributeName="offset" values="0.5;1.5;0.5" dur={animationSpeed} repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor={baseColor} stopOpacity="0">
              <animate attributeName="offset" values="1;2;1" dur={animationSpeed} repeatCount="indefinite" />
            </stop>
          </linearGradient>
          
          {/* Shadow filter */}
          <filter id="equipmentShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="2" dy="2" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* FEED SOURCE */}
        <g transform="translate(50, 180)">
          <circle cx="0" cy="0" r="20" fill="#2a2a2a" stroke="#555" strokeWidth="2" filter="url(#equipmentShadow)" />
          <text x="0" y="5" fill="#aaa" fontSize="12" textAnchor="middle" fontWeight="bold">FEED</text>
          <text x="0" y="40" fill="#888" fontSize="11" textAnchor="middle">{feedFlow.toLocaleString()} kg/h</text>
        </g>

        {/* PIPE: Feed to Preheat */}
        <line x1="70" y1="180" x2="180" y2="180" stroke="#555" strokeWidth="3" />
        <circle cx="100" cy="180" r="3" fill={baseColor}>
          <animate attributeName="cx" values="70;180" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* PREHEAT EXCHANGER E-101 */}
        <g 
          transform="translate(200, 180)" 
          onClick={() => handleUnitClick('preheat')}
          className={cn(interactive && "cursor-pointer hover:opacity-80 transition-opacity")}
        >
          {/* Shell */}
          <rect x="-25" y="-35" width="50" height="70" rx="8" fill="#2a2a2a" stroke={preheatColor} strokeWidth="2" filter="url(#equipmentShadow)" />
          {/* Tubes */}
          <line x1="-20" y1="-20" x2="20" y2="-20" stroke="#444" strokeWidth="1.5" />
          <line x1="-20" y1="-10" x2="20" y2="-10" stroke="#444" strokeWidth="1.5" />
          <line x1="-20" y1="0" x2="20" y2="0" stroke="#444" strokeWidth="1.5" />
          <line x1="-20" y1="10" x2="20" y2="10" stroke="#444" strokeWidth="1.5" />
          <line x1="-20" y1="20" x2="20" y2="20" stroke="#444" strokeWidth="1.5" />
          {preheatActive && preheatStatus?.includes("Stress") && (
            <rect x="-28" y="-35" width="4" height="70" fill="#A13A1F" />
          )}
          <text x="0" y="55" fill="#aaa" fontSize="10" textAnchor="middle" fontWeight="500">E-101</text>
          {interactive && <text x="0" y="67" fill="#888" fontSize="9" textAnchor="middle">Preheater</text>}
        </g>

        {/* Preheat outlet temp display */}
        {interactive && (
          <text x="200" y="145" fill={preheatColor} fontSize="11" textAnchor="middle" fontWeight="500">
            {currentTemp.toFixed(1)}{units}
          </text>
        )}

        {/* BYPASS VALVE PATH */}
        <g opacity={equipment.bypassValve ? 1 : 0.4}>
          {/* Bypass line up */}
          <line x1="180" y1="180" x2="180" y2="120" stroke="#555" strokeWidth="2" strokeDasharray="3,3" />
          {/* Bypass line across */}
          <line x1="180" y1="120" x2="220" y2="120" stroke="#555" strokeWidth="2" strokeDasharray="3,3" />
          {/* Bypass line down */}
          <line x1="220" y1="120" x2="220" y2="180" stroke="#555" strokeWidth="2" strokeDasharray="3,3" />
          {/* Valve symbol */}
          <polygon points="200,110 210,120 200,130 190,120" fill={equipment.bypassValve ? "#2F5D80" : "#7A0F0F"} stroke="#555" strokeWidth="1" />
          {!equipment.bypassValve && <text x="200" y="105" fill="#A13A1F" fontSize="8" textAnchor="middle">OOS</text>}
        </g>

        {/* PIPE: Preheat to Heater */}
        <line x1="225" y1="180" x2="320" y2="180" stroke="#555" strokeWidth="3" />
        <circle cx="250" cy="180" r="3" fill={baseColor}>
          <animate attributeName="cx" values="225;320" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* HEATER H-101 */}
        <g transform="translate(350, 180)">
          <rect x="-30" y="-40" width="60" height="80" rx="5" fill="#2a2a2a" stroke="#666" strokeWidth="2" filter="url(#equipmentShadow)" />
          {/* Burner flames (simplified) */}
          <path d="M -15,-25 L -10,-35 L -5,-25 Z" fill={escalationLevel >= 2 ? "#D4653F" : "#B47A1F"} opacity="0.7" />
          <path d="M 0,-25 L 5,-35 L 10,-25 Z" fill={escalationLevel >= 2 ? "#D4653F" : "#B47A1F"} opacity="0.7" />
          <text x="0" y="55" fill="#aaa" fontSize="10" textAnchor="middle" fontWeight="500">H-101</text>
          <text x="0" y="67" fill="#888" fontSize="9" textAnchor="middle">Heater</text>
        </g>

        {/* PIPE: Heater to Reactor */}
        <line x1="380" y1="180" x2="480" y2="180" stroke="#555" strokeWidth="3" />
        <circle cx="410" cy="180" r="3" fill={baseColor}>
          <animate attributeName="cx" values="380;480" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* REACTOR R-101 */}
        <g 
          transform="translate(550, 200)" 
          onClick={() => handleUnitClick('reactor')}
          className={cn(interactive && "cursor-pointer hover:opacity-80 transition-opacity")}
        >
          {/* Vessel body */}
          <ellipse cx="0" cy="-40" rx="45" ry="8" fill="#1a1a1a" stroke={baseColor} strokeWidth="2" />
          <rect x="-45" y="-40" width="90" height="80" fill="#2a2a2a" stroke={baseColor} strokeWidth="3" filter="url(#equipmentShadow)" />
          <ellipse cx="0" cy="40" rx="45" ry="8" fill="#2a2a2a" stroke={baseColor} strokeWidth="2" />
          {/* Internal glow */}
          {escalationLevel >= 2 && (
            <rect x="-40" y="-35" width="80" height="70" fill={baseColor} opacity="0.15" className={escalationLevel >= 3 ? "animate-pulse" : ""} />
          )}
          <text x="0" y="60" fill="#aaa" fontSize="12" textAnchor="middle" fontWeight="bold">R-101</text>
          <text x="0" y="73" fill="#888" fontSize="10" textAnchor="middle">Reactor</text>
        </g>

        {/* Reactor temp display */}
        {interactive && (
          <text x="550" y="130" fill={baseColor} fontSize="12" textAnchor="middle" fontWeight="600">
            T: {currentTemp.toFixed(1)}{units}
          </text>
        )}

        {/* Slope display */}
        {interactive && slope > 0 && (
          <text x="550" y="145" fill={baseColor} fontSize="10" textAnchor="middle">
            +{slope.toFixed(2)} {units}/min
          </text>
        )}

        {/* PIPE: Reactor to Cooler */}
        <line x1="595" y1="200" x2="700" y2="200" stroke="#555" strokeWidth="3" />
        <circle cx="630" cy="200" r="3" fill={baseColor}>
          <animate attributeName="cx" values="595;700" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* EFFLUENT COOLER E-102 */}
        <g 
          transform="translate(750, 200)" 
          onClick={() => handleUnitClick('cooler')}
          className={cn(
            interactive && "cursor-pointer hover:opacity-80 transition-opacity",
            coolingCapacity === "CONSTRAINED" && "animate-[wiggle_2s_ease-in-out_infinite]"
          )}
        >
          <rect x="-35" y="-35" width="70" height="70" rx="8" fill="#2a2a2a" stroke={coolerColor} strokeWidth="3" filter="url(#equipmentShadow)" />
          {/* Cooling tubes */}
          <line x1="-25" y1="-20" x2="25" y2="-20" stroke="#2F5D80" strokeWidth="1.5" opacity="0.5" />
          <line x1="-25" y1="-10" x2="25" y2="-10" stroke="#2F5D80" strokeWidth="1.5" opacity="0.5" />
          <line x1="-25" y1="0" x2="25" y2="0" stroke="#2F5D80" strokeWidth="1.5" opacity="0.5" />
          <line x1="-25" y1="10" x2="25" y2="10" stroke="#2F5D80" strokeWidth="1.5" opacity="0.5" />
          <line x1="-25" y1="20" x2="25" y2="20" stroke="#2F5D80" strokeWidth="1.5" opacity="0.5" />
          {!equipment.effluentCooler && (
            <>
              <line x1="-30" y1="-30" x2="30" y2="30" stroke="#A13A1F" strokeWidth="2" />
              <line x1="30" y1="-30" x2="-30" y2="30" stroke="#A13A1F" strokeWidth="2" />
            </>
          )}
          <text x="0" y="55" fill="#aaa" fontSize="10" textAnchor="middle" fontWeight="500">E-102</text>
          <text x="0" y="67" fill="#888" fontSize="9" textAnchor="middle">Cooler</text>
        </g>

        {/* Cooling capacity display */}
        {interactive && (
          <text x="750" y="285" fill={coolerColor} fontSize="10" textAnchor="middle" fontWeight="500">
            {coolingCapacity}
          </text>
        )}

        {/* PIPE: Cooler to Separator */}
        <line x1="785" y1="200" x2="880" y2="200" stroke="#555" strokeWidth="3" />
        <circle cx="820" cy="200" r="3" fill={baseColor}>
          <animate attributeName="cx" values="785;880" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* SEPARATOR V-102 */}
        <g transform="translate(930, 200)">
          <ellipse cx="0" cy="-25" rx="25" ry="6" fill="#1a1a1a" stroke="#555" strokeWidth="2" />
          <rect x="-25" y="-25" width="50" height="50" fill="#2a2a2a" stroke="#555" strokeWidth="2" filter="url(#equipmentShadow)" />
          <ellipse cx="0" cy="25" rx="25" ry="6" fill="#2a2a2a" stroke="#555" strokeWidth="2" />
          <text x="0" y="45" fill="#888" fontSize="9" textAnchor="middle">V-102</text>
        </g>

        {/* PIPE: Separator to Column */}
        <line x1="955" y1="200" x2="1020" y2="200" stroke="#555" strokeWidth="2" />

        {/* COLUMN T-101 */}
        <g transform="translate(1070, 200)">
          <ellipse cx="0" cy="-60" rx="30" ry="6" fill="#1a1a1a" stroke="#555" strokeWidth="2" />
          <rect x="-30" y="-60" width="60" height="120" fill="#2a2a2a" stroke="#555" strokeWidth="2" filter="url(#equipmentShadow)" />
          <ellipse cx="0" cy="60" rx="30" ry="6" fill="#2a2a2a" stroke="#555" strokeWidth="2" />
          {/* Trays */}
          <line x1="-25" y1="-40" x2="25" y2="-40" stroke="#444" strokeWidth="1" />
          <line x1="-25" y1="-20" x2="25" y2="-20" stroke="#444" strokeWidth="1" />
          <line x1="-25" y1="0" x2="25" y2="0" stroke="#444" strokeWidth="1" />
          <line x1="-25" y1="20" x2="25" y2="20" stroke="#444" strokeWidth="1" />
          <line x1="-25" y1="40" x2="25" y2="40" stroke="#444" strokeWidth="1" />
          <text x="0" y="80" fill="#888" fontSize="9" textAnchor="middle">T-101</text>
        </g>
      </svg>

      {/* Interactive info panels */}
      {interactive && selectedUnit && (
        <div className="absolute top-4 right-4 bg-[#1e1e1e] border border-[#444] rounded-lg p-4 max-w-[250px]">
          <button 
            onClick={() => setSelectedUnit(null)}
            className="absolute top-2 right-2 text-[#888] hover:text-white text-xs"
          >
            ✕
          </button>
          {selectedUnit === 'preheat' && (
            <>
              <h4 className="text-[#aaa] text-sm font-semibold mb-2">E-101 Preheat Exchanger</h4>
              <p className="text-[#ccc] text-xs">Outlet: {currentTemp.toFixed(1)}{units}</p>
              {preheatActive && (
                <p className="text-[#ccc] text-xs mt-1">Status: {preheatStatus}</p>
              )}
            </>
          )}
          {selectedUnit === 'reactor' && (
            <>
              <h4 className="text-[#aaa] text-sm font-semibold mb-2">R-101 Reactor</h4>
              <p className="text-[#ccc] text-xs">Rate-of-rise: {slope.toFixed(2)} {units}/min</p>
              {nearest && (
                <p className="text-[#ccc] text-xs mt-1">Nearest constraint: {nearest.name} in {typeof timeToNearest === 'number' ? Math.round(timeToNearest) : '—'} min</p>
              )}
            </>
          )}
          {selectedUnit === 'cooler' && (
            <>
              <h4 className="text-[#aaa] text-sm font-semibold mb-2">E-102 Effluent Cooler</h4>
              <p className="text-[#ccc] text-xs">Capacity: {coolingCapacity}</p>
              <p className="text-[#ccc] text-xs mt-1">
                {equipment.effluentCooler ? "Online" : "OFFLINE"}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}