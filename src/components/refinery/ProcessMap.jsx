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

// Master Layout Spec Constants (QHD 2560×1440) - DIRECTIVE COMPLIANT
const Y_SPINE = 680; // Main process spine - slightly above vertical center
const Y_UPPER_ZONE = Y_SPINE - 160; // Upper zone for input control
const Y_LOWER_ZONE = Y_SPINE + 200; // Lower zone for output control

// Equipment Anchors - ALL ON SPINE
const ANCHORS = {
  F1: { x: 280, y: Y_SPINE },
  E1: { x: 720, y: Y_SPINE },
  R1: { x: 1120, y: Y_SPINE },
  E2: { x: 1600, y: Y_SPINE },
  D1: { x: 2100, y: Y_SPINE },
};

// Equipment Sizes
const SIZES = {
  F1: { w: 90, h: 140 },
  E1: { w: 280, h: 160 },
  R1: { w: 180, h: 200 }, // 2-bed reactor (reduced height)
  E2: { w: 180, h: 180 },
  D1: { w: 280, h: 140 },
};

// Valve Positions - ZONED
const VALVES = {
  TCV01B: { x: 500, y: Y_SPINE }, // On spine - main feed control
  TCV01A: { x: 720, y: Y_UPPER_ZONE }, // Upper zone - tube bypass
  TCV02A: { x: 1300, y: Y_UPPER_ZONE }, // Upper zone - shell inlet control
  TCV02B: { x: 1120, y: Y_LOWER_ZONE }, // Lower zone - shell bypass
  TCV03A: { x: 1600, y: Y_LOWER_ZONE }, // Lower zone - cooler bypass
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
  sensorQuality,
  opMode,
  bedImbalance,
  hotSpotRisk,
  interactive = true,
  units = "°C",
}) {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const baseColor = LEVEL_COLORS[escalationLevel] || LEVEL_COLORS[0];
  const coolerColor = COOLING_COLORS[coolingCapacity] || COOLING_COLORS.NORMAL;
  
  const flowSpeedMultiplier = escalationLevel === 0 ? 1.0 : escalationLevel === 1 ? 1.2 : escalationLevel === 2 ? 1.5 : 1.8;
  const animationSpeed = `${8 / flowSpeedMultiplier}s`;
  
  const valveStates = {
    tcv01a: equipment.bypassValve ? "CLOSED" : "OOS",
    tcv01b: "OPEN",
    tcv02a: escalationLevel >= 2 && !equipment.preheatExchanger ? "MODULATING" : "OPEN",
    tcv02b: equipment.bypassValve && escalationLevel >= 2 ? "MODULATING" : "CLOSED",
    tcv03a: coolingCapacity === "CONSTRAINED" ? "OPEN" : "CLOSED",
  };

  const preheatColor = preheatActive && preheatStatus?.includes("stress") ? "#A13A1F" 
    : preheatActive && preheatStatus?.includes("Warning") ? "#B47A1F" 
    : "#0F5F5F";

  const handleUnitClick = (unit) => {
    if (!interactive) return;
    setSelectedUnit(selectedUnit === unit ? null : unit);
  };

  const reactorOutletTemp = currentTemp + 15;
  const tubeSideOutletTemp = valveStates.tcv01a === "OPEN" ? currentTemp * 0.85 : currentTemp;
  const shellSideOutletTemp = valveStates.tcv02b === "OPEN" ? reactorOutletTemp * 0.95 : Math.max(reactorOutletTemp - 50, 280);
  const coolerOutletTemp = valveStates.tcv03a === "OPEN" ? shellSideOutletTemp : Math.max(shellSideOutletTemp - 40, 240);
  
  const getThermalColor = (temp) => {
    if (temp < 300) return "#0F5F5F";
    if (temp < 340) return "#2F5D80";
    if (temp < 360) return "#B47A1F";
    if (temp < 375) return "#D4653F";
    return "#A13A1F";
  };
  
  const tubeThermalColor = getThermalColor(tubeSideOutletTemp);
  const shellThermalColor = getThermalColor(reactorOutletTemp);
  const cooledThermalColor = getThermalColor(coolerOutletTemp);

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 relative">
      <svg viewBox="0 0 2560 1200" className="w-full h-auto">
        <defs>
          <filter id="equipmentShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
            <feOffset dx="2" dy="3" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.4" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          <linearGradient id="reactorGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={baseColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={baseColor} stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* FEED FILTER F-1 */}
        <g transform={`translate(${ANCHORS.F1.x}, ${ANCHORS.F1.y})`} onClick={() => handleUnitClick('f1')} className={cn(interactive && "cursor-pointer")}>
          <ellipse cx="0" cy={-SIZES.F1.h/2} rx={SIZES.F1.w/5} ry="6" fill="#1a1a1a" stroke="#555" strokeWidth="2.5" />
          <rect x={-SIZES.F1.w/2} y={-SIZES.F1.h/2} width={SIZES.F1.w} height={SIZES.F1.h} fill="#2a2a2a" stroke="#555" strokeWidth="3" filter="url(#equipmentShadow)" />
          <ellipse cx="0" cy={SIZES.F1.h/2} rx={SIZES.F1.w/5} ry="6" fill="#2a2a2a" stroke="#555" strokeWidth="2.5" />
          {[-30, -10, 10, 30].map(y => (
            <line key={y} x1={-SIZES.F1.w/3} y1={y} x2={SIZES.F1.w/3} y2={y} stroke="#444" strokeWidth="1.8" opacity="0.9" />
          ))}
          <text x="0" y={SIZES.F1.h/2 + 24} fill="#aaa" fontSize="22" textAnchor="middle" fontWeight="600">F-1</text>
          {interactive && (
            <>
              <text x="0" y={SIZES.F1.h/2 + 42} fill="#888" fontSize="18" textAnchor="middle">Filter</text>
              <text x="0" y={-SIZES.F1.h/2 - 16} fill="#999" fontSize="18" textAnchor="middle">{feedFlow.toLocaleString()} kg/h</text>
            </>
          )}
        </g>

        {/* SPINE: F-1 to TCV-01B */}
        <line x1={ANCHORS.F1.x + SIZES.F1.w/2} y1={Y_SPINE} x2={VALVES.TCV01B.x - 20} y2={Y_SPINE} stroke="#555" strokeWidth="4" opacity="0.9" />
        <circle cx={(ANCHORS.F1.x + VALVES.TCV01B.x)/2} cy={Y_SPINE} r="4" fill="#2F5D80">
          <animate attributeName="cx" values={`${ANCHORS.F1.x + SIZES.F1.w/2};${VALVES.TCV01B.x - 20}`} dur={animationSpeed} repeatCount="indefinite" />
        </circle>
        
        {/* TCV-01B: Primary Feed Control - ON SPINE */}
        <g transform={`translate(${VALVES.TCV01B.x}, ${VALVES.TCV01B.y})`} onClick={() => handleUnitClick('tcv01b')} className={cn(interactive && "cursor-pointer")}>
          <polygon points="-9,-9 9,-9 7,0 9,9 -9,9 -7,0" fill="#2F5D80" stroke="#555" strokeWidth="2" />
          {interactive && <text x="0" y="-24" fill="#aaa" fontSize="18" textAnchor="middle" fontWeight="600">TCV-01B</text>}
        </g>
        
        {/* SPINE: TCV-01B to E-1 Tube Inlet */}
        <line x1={VALVES.TCV01B.x + 20} y1={Y_SPINE} x2={ANCHORS.E1.x - SIZES.E1.w/2} y2={Y_SPINE} stroke="#555" strokeWidth="4" opacity="0.9" />
        <circle cx={(VALVES.TCV01B.x + ANCHORS.E1.x)/2} cy={Y_SPINE} r="4" fill="#2F5D80">
          <animate attributeName="cx" values={`${VALVES.TCV01B.x + 20};${ANCHORS.E1.x - SIZES.E1.w/2}`} dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* FEED/EFFLUENT HEAT EXCHANGER E-1 */}
        <g transform={`translate(${ANCHORS.E1.x}, ${ANCHORS.E1.y})`} onClick={() => handleUnitClick('e1')} className={cn(interactive && "cursor-pointer hover:opacity-90 transition-all duration-400")}>
          <ellipse cx={-SIZES.E1.w/2} cy="0" rx="12" ry={SIZES.E1.h/2 - 10} fill="#1a1a1a" stroke={preheatColor} strokeWidth="2.5" />
          <rect x={-SIZES.E1.w/2} y={-SIZES.E1.h/2 + 10} width={SIZES.E1.w} height={SIZES.E1.h - 20} fill="#2a2a2a" stroke={preheatColor} strokeWidth="3" filter="url(#equipmentShadow)" />
          <ellipse cx={SIZES.E1.w/2} cy="0" rx="12" ry={SIZES.E1.h/2 - 10} fill="#2a2a2a" stroke={preheatColor} strokeWidth="2.5" />
          
          {[-50, -35, -20, -5, 10, 25, 40, 55].map(yOffset => (
            <line key={yOffset} x1={-SIZES.E1.w/2 + 15} y1={yOffset} x2={SIZES.E1.w/2 - 15} y2={yOffset} stroke="#444" strokeWidth="1.5" opacity="0.9" />
          ))}
          
          <rect x={-SIZES.E1.w/2 + 15} y={-SIZES.E1.h/2 + 20} width={SIZES.E1.w - 30} height={SIZES.E1.h - 40} fill={tubeThermalColor} opacity="0.108" className="transition-all duration-500" />
          <rect x={-SIZES.E1.w/2 + 10} y={-SIZES.E1.h/2 + 15} width={SIZES.E1.w - 20} height={SIZES.E1.h - 30} fill={shellThermalColor} opacity="0.072" className="transition-all duration-500" />
          
          <circle cx={-SIZES.E1.w/2} cy="0" r="6" fill="#333" stroke={tubeThermalColor} strokeWidth="2" />
          <circle cx={SIZES.E1.w/2} cy="0" r="6" fill="#333" stroke={tubeThermalColor} strokeWidth="2" />
          <circle cx={-SIZES.E1.w/2} cy={-SIZES.E1.h/2 + 20} r="6" fill="#333" stroke={shellThermalColor} strokeWidth="2" />
          <circle cx={SIZES.E1.w/2} cy={SIZES.E1.h/2 - 20} r="6" fill="#333" stroke={shellThermalColor} strokeWidth="2" />
          
          <text x="0" y={SIZES.E1.h/2 + 28} fill="#aaa" fontSize="22" textAnchor="middle" fontWeight="600">E-1</text>
          {interactive && <text x="0" y={SIZES.E1.h/2 + 48} fill="#888" fontSize="18" textAnchor="middle">Shell & Tube HX</text>}
        </g>

{/* Minimal E-1 labels */}

        {/* UPPER ZONE: TUBE BYPASS (TCV-01A) - ORBITS ABOVE SPINE */}
        <g opacity={valveStates.tcv01a === "OOS" ? 0.3 : 1}>
          <line x1={VALVES.TCV01B.x + 20} y1={Y_SPINE} x2={VALVES.TCV01B.x + 20} y2={Y_UPPER_ZONE} stroke="#555" strokeWidth="3" strokeDasharray="6,6" opacity="0.9" />
          <line x1={VALVES.TCV01B.x + 20} y1={Y_UPPER_ZONE} x2={ANCHORS.E1.x + SIZES.E1.w/2} y2={Y_UPPER_ZONE} stroke="#555" strokeWidth="3" strokeDasharray="6,6" opacity="0.9" />
          <line x1={ANCHORS.E1.x + SIZES.E1.w/2} y1={Y_UPPER_ZONE} x2={ANCHORS.E1.x + SIZES.E1.w/2} y2={Y_SPINE} stroke="#555" strokeWidth="3" strokeDasharray="6,6" opacity="0.9" />
          
          <g transform={`translate(${VALVES.TCV01A.x}, ${VALVES.TCV01A.y})`} onClick={() => handleUnitClick('tcv01a')} className={cn(interactive && "cursor-pointer")}>
            <polygon points="-9,-9 9,-9 7,0 9,9 -9,9 -7,0" fill={valveStates.tcv01a === "OPEN" ? "#2F5D80" : "#333"} stroke={valveStates.tcv01a === "OOS" ? "#A13A1F" : "#555"} strokeWidth="2" />
            {interactive && <text x="0" y="-24" fill="#aaa" fontSize="18" textAnchor="middle" fontWeight="600">TCV-01A</text>}
          </g>
          
          {valveStates.tcv01a === "OPEN" && (
            <circle cx={VALVES.TCV01A.x} cy={VALVES.TCV01A.y} r="4" fill="#2F5D80">
              <animate attributeName="cx" values={`${VALVES.TCV01B.x + 20};${ANCHORS.E1.x + SIZES.E1.w/2}`} dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {/* SPINE: E-1 Tube Out to Reactor */}
        <line x1={ANCHORS.E1.x + SIZES.E1.w/2} y1={Y_SPINE} x2={ANCHORS.R1.x - SIZES.R1.w/2} y2={Y_SPINE} stroke="#555" strokeWidth="4" opacity="0.9" />
        <circle cx={(ANCHORS.E1.x + ANCHORS.R1.x)/2} cy={Y_SPINE} r="4" fill={tubeThermalColor}>
          <animate attributeName="cx" values={`${ANCHORS.E1.x + SIZES.E1.w/2};${ANCHORS.R1.x - SIZES.R1.w/2}`} dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* REACTOR R-1 - 2 BED CONFIGURATION */}
        <g transform={`translate(${ANCHORS.R1.x}, ${ANCHORS.R1.y})`} onClick={() => handleUnitClick('r1')} className={cn(interactive && "cursor-pointer hover:opacity-90 transition-all duration-400")}>
          <ellipse cx="0" cy={-SIZES.R1.h/2} rx={SIZES.R1.w/2} ry="12" fill="#1a1a1a" stroke={baseColor} strokeWidth="3" />
          <rect x={-SIZES.R1.w/2} y={-SIZES.R1.h/2} width={SIZES.R1.w} height={SIZES.R1.h} fill="#2a2a2a" stroke={baseColor} strokeWidth="4" filter="url(#equipmentShadow)" />
          <ellipse cx="0" cy={SIZES.R1.h/2} rx={SIZES.R1.w/2} ry="12" fill="#2a2a2a" stroke={baseColor} strokeWidth="3" />
          
          {/* 2-BED SYSTEM */}
          {bedImbalance && [bedImbalance.beds[0], bedImbalance.beds[1]].filter(Boolean).map((bed, idx) => {
            const bedHeight = 85;
            const yStart = -85 + (idx * 95);
            const isDominant = bed.id === bedImbalance.dominantBed;
            
            const getBedColor = () => {
              if (hotSpotRisk === "HIGH" && isDominant) return "#A13A1F";
              if (hotSpotRisk === "MEDIUM" && isDominant) return "#B47A1F";
              if (isDominant && bedImbalance.severity === "SEVERE") return "#A13A1F";
              if (isDominant && bedImbalance.severity === "MILD") return "#B47A1F";
              if (escalationLevel >= 2) return "#B47A1F";
              if (escalationLevel >= 1) return "#2F5D80";
              return "#0F5F5F";
            };
            
            const bedColor = getBedColor();
            const glowIntensity = isDominant && hotSpotRisk === "HIGH" ? 0.5 : isDominant && hotSpotRisk === "MEDIUM" ? 0.3 : 0;
            const bedOpacity = 0.15 + glowIntensity;
            
            return (
              <g key={bed.id}>
                <rect 
                  x={-SIZES.R1.w/2 + 8} 
                  y={yStart} 
                  width={SIZES.R1.w - 16} 
                  height={bedHeight} 
                  fill={bedColor} 
                  opacity={bedOpacity}
                  className="transition-all duration-500"
                />
                
                {Array.from({ length: 84 }).map((_, pidx) => {
                  const row = Math.floor(pidx / 12);
                  const col = pidx % 12;
                  const px = -SIZES.R1.w/2 + 20 + col * 12;
                  const py = yStart + 12 + row * 10;
                  return (
                    <circle
                      key={pidx}
                      cx={px}
                      cy={py}
                      r="2"
                      fill={bedColor}
                      opacity={0.6 + glowIntensity}
                      className="transition-all duration-500"
                    />
                  );
                })}
                
                {interactive && (
                  <text x={-SIZES.R1.w/2 - 24} y={yStart + bedHeight / 2 + 4} fill="#666" fontSize="18" textAnchor="middle">B{bed.id}</text>
                )}
                
                {/* H₂ QUENCH - VERTICAL, LIGHT WEIGHT, SUBORDINATE */}
                {idx === 0 && (
                  <g opacity="0.5">
                    <line x1={SIZES.R1.w/2 + 20} y1={yStart + bedHeight + 4} x2={SIZES.R1.w/2 + 40} y2={yStart + bedHeight + 4} stroke="#4A90E2" strokeWidth="1.5" strokeDasharray="3,3" />
                    <circle cx={SIZES.R1.w/2 + 30} cy={yStart + bedHeight + 4} r="2.5" fill="#4A90E2" opacity="0.6">
                      {equipment.h2Compressor && (
                        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2.5s" repeatCount="indefinite" />
                      )}
                    </circle>
                    {interactive && (
                      <text x={SIZES.R1.w/2 + 52} y={yStart + bedHeight + 7} fill="#4A90E2" fontSize="14" textAnchor="start" opacity="0.5">H₂</text>
                    )}
                  </g>
                )}
              </g>
            );
          })}
          
          {escalationLevel >= 2 && (
            <rect x={-SIZES.R1.w/2 + 5} y={-SIZES.R1.h/2 + 5} width={SIZES.R1.w - 10} height={SIZES.R1.h - 10} fill="url(#reactorGlow)" opacity="1.08" className={escalationLevel >= 3 ? "animate-[pulse_1.2s_ease-in-out_infinite]" : "transition-opacity duration-500"} />
          )}
          
          <text x="0" y={SIZES.R1.h/2 + 30} fill="#aaa" fontSize="22" textAnchor="middle" fontWeight="bold">R-1</text>
        </g>

        {/* R-1 Temperature Display - Anchored to top-right corner */}
        {interactive && (
          <>
            <text x={ANCHORS.R1.x + SIZES.R1.w/2 + 16} y={ANCHORS.R1.y - SIZES.R1.h/2 - 18} fill="#888" fontSize="20" textAnchor="start">Outlet</text>
            <text x={ANCHORS.R1.x + SIZES.R1.w/2 + 16} y={ANCHORS.R1.y - SIZES.R1.h/2 + 4} fill={baseColor} fontSize="22" textAnchor="start" fontWeight="700" className="transition-colors duration-400">
              {currentTemp.toFixed(1)}{units}
            </text>
            {slope > 0 && (
              <text x={ANCHORS.R1.x + SIZES.R1.w/2 + 16} y={ANCHORS.R1.y - SIZES.R1.h/2 + 24} fill={baseColor} fontSize="18" textAnchor="start" className="transition-colors duration-400">
                ΔT +{slope.toFixed(2)} {units}/min
              </text>
            )}
          </>
        )}

        {/* PIPE: R-1 Outlet - Routes UNDER reactor */}
        <line x1={ANCHORS.R1.x + SIZES.R1.w/2} y1={ANCHORS.R1.y - SIZES.R1.h/2 + 30} x2={ANCHORS.R1.x + SIZES.R1.w/2 + 30} y2={ANCHORS.R1.y - SIZES.R1.h/2 + 30} stroke="#555" strokeWidth="4" opacity="0.9" />
        <line x1={ANCHORS.R1.x + SIZES.R1.w/2 + 30} y1={ANCHORS.R1.y - SIZES.R1.h/2 + 30} x2={ANCHORS.R1.x + SIZES.R1.w/2 + 30} y2={ANCHORS.R1.y + SIZES.R1.h/2 + 40} stroke="#555" strokeWidth="4" opacity="0.9" />
        <circle cx={ANCHORS.R1.x + SIZES.R1.w/2 + 30} cy={(ANCHORS.R1.y - SIZES.R1.h/2 + ANCHORS.R1.y + SIZES.R1.h/2)/2} r="4" fill={shellThermalColor}>
          <animate attributeName="cy" values={`${ANCHORS.R1.y - SIZES.R1.h/2 + 30};${ANCHORS.R1.y + SIZES.R1.h/2 + 40}`} dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* UPPER BRANCH: TCV-02A to E-1 Shell Inlet - OUTSIDE reactor */}
        <g>
          <line x1={ANCHORS.R1.x + SIZES.R1.w/2 + 30} y1={ANCHORS.R1.y + SIZES.R1.h/2 + 40} x2={VALVES.TCV02A.x} y2={ANCHORS.R1.y + SIZES.R1.h/2 + 40} stroke="#555" strokeWidth="3" opacity="0.9" />
          {valveStates.tcv02a !== "CLOSED" && (
            <circle cx={(ANCHORS.R1.x + VALVES.TCV02A.x)/2} cy={ANCHORS.R1.y + SIZES.R1.h/2 + 40} r="4" fill={shellThermalColor}>
              <animate attributeName="cx" values={`${ANCHORS.R1.x + SIZES.R1.w/2 + 30};${VALVES.TCV02A.x}`} dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
          
          <line x1={VALVES.TCV02A.x} y1={ANCHORS.R1.y + SIZES.R1.h/2 + 40} x2={VALVES.TCV02A.x} y2={VALVES.TCV02A.y + 14} stroke="#555" strokeWidth="3" opacity="0.9" />
          
          <g transform={`translate(${VALVES.TCV02A.x}, ${VALVES.TCV02A.y})`} onClick={() => handleUnitClick('tcv02a')} className={cn(interactive && "cursor-pointer")}>
            <polygon points="-9,-9 9,-9 7,0 9,9 -9,9 -7,0" fill={valveStates.tcv02a === "OPEN" ? "#2F5D80" : "#B47A1F"} stroke="#555" strokeWidth="2" />
            <text x="0" y="-24" fill="#aaa" fontSize="20" textAnchor="middle" fontWeight="600">TCV-02A</text>
          </g>
          
          <line x1={VALVES.TCV02A.x} y1={VALVES.TCV02A.y - 14} x2={VALVES.TCV02A.x} y2={ANCHORS.E1.y + SIZES.E1.h/2 - 20} stroke="#555" strokeWidth="3" opacity="0.9" />
          <line x1={VALVES.TCV02A.x} y1={ANCHORS.E1.y + SIZES.E1.h/2 - 20} x2={ANCHORS.E1.x + SIZES.E1.w/2} y2={ANCHORS.E1.y + SIZES.E1.h/2 - 20} stroke="#555" strokeWidth="3" opacity="0.9" />
          {valveStates.tcv02a !== "CLOSED" && (
            <circle cx={(VALVES.TCV02A.x + ANCHORS.E1.x)/2} cy={ANCHORS.E1.y + SIZES.E1.h/2 - 20} r="4" fill={shellThermalColor}>
              <animate attributeName="cx" values={`${VALVES.TCV02A.x};${ANCHORS.E1.x + SIZES.E1.w/2}`} dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {/* LOWER BRANCH: TCV-02B Shell Bypass (BELOW reactor, moved down 30px) */}
        <g opacity={valveStates.tcv02b === "CLOSED" ? 0.3 : 1}>
          <line x1={ANCHORS.R1.x + SIZES.R1.w/2 + 30} y1={ANCHORS.R1.y + SIZES.R1.h/2 + 40} x2={VALVES.TCV02B.x} y2={ANCHORS.R1.y + SIZES.R1.h/2 + 40} stroke="#555" strokeWidth="3" strokeDasharray="6,6" opacity="0.9" />
          <line x1={VALVES.TCV02B.x} y1={ANCHORS.R1.y + SIZES.R1.h/2 + 40} x2={VALVES.TCV02B.x} y2={VALVES.TCV02B.y + 30 - 14} stroke="#555" strokeWidth="3" strokeDasharray="6,6" opacity="0.9" />
          
          <g transform={`translate(${VALVES.TCV02B.x}, ${VALVES.TCV02B.y + 30})`} onClick={() => handleUnitClick('tcv02b')} className={cn(interactive && "cursor-pointer")}>
            <polygon points="-9,-9 9,-9 7,0 9,9 -9,9 -7,0" fill={valveStates.tcv02b === "OPEN" ? "#B47A1F" : "#333"} stroke="#555" strokeWidth="2" />
            <text x="0" y="28" fill="#aaa" fontSize="20" textAnchor="middle" fontWeight="600">TCV-02B</text>
            {interactive && <text x="0" y="46" fill="#888" fontSize="18" textAnchor="middle">Shell Bypass</text>}
          </g>
          
          <line x1={VALVES.TCV02B.x} y1={VALVES.TCV02B.y + 30 + 14} x2={VALVES.TCV02B.x} y2={ANCHORS.E1.y + SIZES.E1.h/2 - 20} stroke="#555" strokeWidth="3" strokeDasharray="6,6" opacity="0.9" />
          <line x1={VALVES.TCV02B.x} y1={ANCHORS.E1.y + SIZES.E1.h/2 - 20} x2={ANCHORS.E1.x - SIZES.E1.w/2} y2={ANCHORS.E1.y + SIZES.E1.h/2 - 20} stroke="#555" strokeWidth="3" strokeDasharray="6,6" opacity="0.9" />
          
          {valveStates.tcv02b !== "CLOSED" && (
            <circle cx={(VALVES.TCV02B.x + ANCHORS.E1.x)/2} cy={ANCHORS.E1.y + SIZES.E1.h/2 - 20} r="4" fill="#B47A1F">
              <animate attributeName="cx" values={`${VALVES.TCV02B.x};${ANCHORS.E1.x - SIZES.E1.w/2}`} dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {/* PIPE: E-1 Shell Out to E-2 */}
        <line x1={ANCHORS.E1.x - SIZES.E1.w/2} y1={ANCHORS.E1.y + SIZES.E1.h/2 - 20} x2={ANCHORS.E1.x - SIZES.E1.w/2} y2={Y_MID} stroke="#555" strokeWidth="3" opacity="0.9" />
        <line x1={ANCHORS.E1.x - SIZES.E1.w/2} y1={Y_MID} x2={ANCHORS.E2.x - SIZES.E2.w/2} y2={Y_MID} stroke="#555" strokeWidth="4" opacity="0.9" />
        <circle cx={(ANCHORS.E1.x + ANCHORS.E2.x)/2} cy={Y_MID} r="4" fill={getThermalColor(shellSideOutletTemp)}>
          <animate attributeName="cx" values={`${ANCHORS.E1.x - SIZES.E1.w/2};${ANCHORS.E2.x - SIZES.E2.w/2}`} dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* EFFLUENT COOLER E-2 */}
        <g transform={`translate(${ANCHORS.E2.x}, ${ANCHORS.E2.y})`} onClick={() => handleUnitClick('e2')} className={cn(interactive && "cursor-pointer hover:opacity-90 transition-all duration-400", coolingCapacity === "CONSTRAINED" && "animate-[wiggle_2s_ease-in-out_infinite]")}>
          <rect x={-SIZES.E2.w/2} y={-SIZES.E2.h/2} width={SIZES.E2.w} height={SIZES.E2.h} rx="12" fill="#2a2a2a" stroke={coolerColor} strokeWidth="3" filter="url(#equipmentShadow)" className="transition-all duration-400" />
          {[-60, -40, -20, 0, 20, 40, 60].map(y => (
            <line key={y} x1={-SIZES.E2.w/2 + 20} y1={y} x2={SIZES.E2.w/2 - 20} y2={y} stroke="#2F5D80" strokeWidth="2.5" opacity="0.54" />
          ))}
          {!equipment.effluentCooler && (
            <>
              <line x1={-SIZES.E2.w/2 + 10} y1={-SIZES.E2.h/2 + 10} x2={SIZES.E2.w/2 - 10} y2={SIZES.E2.h/2 - 10} stroke="#A13A1F" strokeWidth="4" />
              <line x1={SIZES.E2.w/2 - 10} y1={-SIZES.E2.h/2 + 10} x2={-SIZES.E2.w/2 + 10} y2={SIZES.E2.h/2 - 10} stroke="#A13A1F" strokeWidth="4" />
            </>
          )}
          <text x="0" y={SIZES.E2.h/2 + 28} fill="#aaa" fontSize="22" textAnchor="middle" fontWeight="600">E-2</text>
          {interactive && <text x="0" y={SIZES.E2.h/2 + 48} fill="#888" fontSize="18" textAnchor="middle">Effluent Cooler</text>}
        </g>

        {/* COOLER BYPASS (TCV-03A) */}
        <g opacity={valveStates.tcv03a === "CLOSED" ? 0.3 : 1}>
          <line x1={ANCHORS.E2.x - SIZES.E2.w/2} y1={Y_MID} x2={ANCHORS.E2.x - SIZES.E2.w/2} y2={VALVES.TCV03A.y} stroke="#555" strokeWidth="3" strokeDasharray="6,6" opacity="0.9" />
          <line x1={ANCHORS.E2.x - SIZES.E2.w/2} y1={VALVES.TCV03A.y} x2={ANCHORS.E2.x + SIZES.E2.w/2} y2={VALVES.TCV03A.y} stroke="#555" strokeWidth="3" strokeDasharray="6,6" opacity="0.9" />
          <line x1={ANCHORS.E2.x + SIZES.E2.w/2} y1={VALVES.TCV03A.y} x2={ANCHORS.E2.x + SIZES.E2.w/2} y2={Y_MID} stroke="#555" strokeWidth="3" strokeDasharray="6,6" opacity="0.9" />
          
          <g transform={`translate(${VALVES.TCV03A.x}, ${VALVES.TCV03A.y})`} onClick={() => handleUnitClick('tcv03a')} className={cn(interactive && "cursor-pointer")}>
            <polygon points="-9,-9 9,-9 7,0 9,9 -9,9 -7,0" fill={valveStates.tcv03a === "OPEN" ? "#B47A1F" : "#333"} stroke="#555" strokeWidth="2" />
            <text x="0" y="38" fill="#aaa" fontSize="20" textAnchor="middle" fontWeight="600">TCV-03A</text>
            {interactive && <text x="0" y="58" fill="#888" fontSize="18" textAnchor="middle">Cooler Bypass</text>}
          </g>
          
          {valveStates.tcv03a === "OPEN" && (
            <circle cx={VALVES.TCV03A.x} cy={VALVES.TCV03A.y} r="4" fill="#B47A1F">
              <animate attributeName="cx" values={`${ANCHORS.E2.x - SIZES.E2.w/2};${ANCHORS.E2.x + SIZES.E2.w/2}`} dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {/* PIPE: E-2 to D-1 */}
        <line x1={ANCHORS.E2.x + SIZES.E2.w/2} y1={Y_MID} x2={ANCHORS.D1.x - SIZES.D1.w/2} y2={Y_MID} stroke="#555" strokeWidth="4" opacity="0.9" />
        <circle cx={(ANCHORS.E2.x + ANCHORS.D1.x)/2} cy={Y_MID} r="4" fill={cooledThermalColor}>
          <animate attributeName="cx" values={`${ANCHORS.E2.x + SIZES.E2.w/2};${ANCHORS.D1.x - SIZES.D1.w/2}`} dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* THREE-PHASE SEPARATOR D-1 */}
        <g transform={`translate(${ANCHORS.D1.x}, ${ANCHORS.D1.y})`} onClick={() => handleUnitClick('d1')} className={cn(interactive && "cursor-pointer hover:opacity-90 transition-all duration-400")}>
          <ellipse cx={-SIZES.D1.w/2} cy="0" rx="12" ry={SIZES.D1.h/2} fill="#1a1a1a" stroke="#555" strokeWidth="3" />
          <rect x={-SIZES.D1.w/2} y={-SIZES.D1.h/2} width={SIZES.D1.w} height={SIZES.D1.h} fill="#2a2a2a" stroke="#555" strokeWidth="3" filter="url(#equipmentShadow)" />
          <ellipse cx={SIZES.D1.w/2} cy="0" rx="12" ry={SIZES.D1.h/2} fill="#2a2a2a" stroke="#555" strokeWidth="3" />
          
          <rect x={-SIZES.D1.w/2 + 10} y={-SIZES.D1.h/2 + 10} width={SIZES.D1.w - 20} height={28} fill="#333" opacity="0.3" />
          <text x="0" y={-SIZES.D1.h/2 + 30} fill="#888" fontSize="16" textAnchor="middle">Gas</text>
          <path d={`M ${-SIZES.D1.w/2 + 40},${-SIZES.D1.h/2 + 18} L ${-SIZES.D1.w/2 + 60},${-SIZES.D1.h/2 + 28} L ${-SIZES.D1.w/2 + 80},${-SIZES.D1.h/2 + 18} L ${-SIZES.D1.w/2 + 100},${-SIZES.D1.h/2 + 28} L ${-SIZES.D1.w/2 + 120},${-SIZES.D1.h/2 + 18}`} stroke="#555" strokeWidth="1.5" fill="none" />
          
          <rect x={-SIZES.D1.w/2 + 10} y={-SIZES.D1.h/2 + 38} width={SIZES.D1.w - 20} height={28} fill="#B47A1F" opacity="0.2" />
          <text x="0" y={-SIZES.D1.h/2 + 58} fill="#D4A547" fontSize="16" textAnchor="middle">Naphtha</text>
          <line x1={SIZES.D1.w/2 - 100} y1={-SIZES.D1.h/2 + 38} x2={SIZES.D1.w/2 - 100} y2={SIZES.D1.h/2 - 10} stroke="#555" strokeWidth="2.5" />
          
          <rect x={-SIZES.D1.w/2 + 10} y={-SIZES.D1.h/2 + 66} width={SIZES.D1.w - 20} height={20} fill="#2F5D80" opacity="0.2" />
          <text x="0" y={-SIZES.D1.h/2 + 80} fill="#2F5D80" fontSize="16" textAnchor="middle">Water</text>
          
          <line x1={-SIZES.D1.w/2 + 20} y1={-SIZES.D1.h/2 + 52} x2={-SIZES.D1.w/2 + 30} y2={-SIZES.D1.h/2 + 52} stroke="#D4A547" strokeWidth="2.5" />
          <line x1={-SIZES.D1.w/2 + 20} y1={SIZES.D1.h/2 - 10} x2={-SIZES.D1.w/2 + 30} y2={SIZES.D1.h/2 - 10} stroke="#2F5D80" strokeWidth="2.5" />
          
          <line x1="0" y1={-SIZES.D1.h/2} x2="0" y2={-SIZES.D1.h/2 - 40} stroke="#888" strokeWidth="2.5" />
          <text x="0" y={-SIZES.D1.h/2 - 48} fill="#888" fontSize="18" textAnchor="middle">Gas Out</text>
          
          <line x1={SIZES.D1.w/2} y1={-SIZES.D1.h/2 + 52} x2={SIZES.D1.w/2 + 30} y2={-SIZES.D1.h/2 + 52} stroke="#D4A547" strokeWidth="2.5" />
          
          <text x="0" y={SIZES.D1.h/2 + 28} fill="#aaa" fontSize="22" textAnchor="middle" fontWeight="600">D-1</text>
          {interactive && <text x="0" y={SIZES.D1.h/2 + 48} fill="#888" fontSize="18" textAnchor="middle">3-Phase Separator</text>}
        </g>

        {/* H2O Pot (below separator) */}
        <g transform={`translate(${ANCHORS.D1.x}, ${ANCHORS.D1.y + SIZES.D1.h/2 + 6})`}>
          <ellipse cx="0" cy="0" rx="21" ry="6" fill="#1a1a1a" stroke="#555" strokeWidth="3" />
          <rect x="-21" y="0" width="42" height="70" fill="#2a2a2a" stroke="#555" strokeWidth="3" />
          <ellipse cx="0" cy="70" rx="21" ry="6" fill="#2a2a2a" stroke="#555" strokeWidth="3" />
          <line x1="0" y1="-6" x2="0" y2="0" stroke="#2F5D80" strokeWidth="2.5" />
          <rect x="-18" y="42" width="36" height="18" fill="#2F5D80" opacity="0.25" />
          <line x1="-14" y1="54" x2="14" y2="54" stroke="#2F5D80" strokeWidth="2" opacity="0.6" />
          {interactive && <text x="0" y="92" fill="#888" fontSize="16" textAnchor="middle">H₂O Pot</text>}
        </g>

        {/* Gas Recycle System */}
        <g opacity="0.5">
          <line x1={ANCHORS.D1.x} y1={ANCHORS.D1.y - SIZES.D1.h/2 - 40} x2={ANCHORS.D1.x} y2={ANCHORS.D1.y - SIZES.D1.h/2 - 80} stroke="#0FC9C9" strokeWidth="2.5" strokeDasharray="4,4" />
          <text x={ANCHORS.D1.x} y={ANCHORS.D1.y - SIZES.D1.h/2 - 90} fill="#888" fontSize="16" textAnchor="middle">To H₂ Compressor</text>
          
          <line x1={ANCHORS.R1.x + SIZES.R1.w/2 + 15} y1={ANCHORS.R1.y - SIZES.R1.h/2 - 60} x2={ANCHORS.R1.x + SIZES.R1.w/2 + 15} y2={ANCHORS.R1.y - SIZES.R1.h/2 - 20} stroke="#0FC9C9" strokeWidth="2.5" strokeDasharray="4,4" />
          <text x={ANCHORS.R1.x + SIZES.R1.w/2 + 15} y={ANCHORS.R1.y - SIZES.R1.h/2 - 70} fill="#888" fontSize="16" textAnchor="middle">From H₂ System</text>
        </g>

        {/* Status indicators */}
        {interactive && (
          <>
            <g transform="translate(200, 200)">
              <rect x="0" y="0" width="240" height="40" rx="6" fill="#1e1e1e" stroke="#444" strokeWidth="1.5" />
              <text x="120" y="26" fill={sensorQuality === "good" ? "#0F9F9F" : sensorQuality === "suspect" ? "#D4A547" : "#D4653F"} fontSize="18" textAnchor="middle" fontWeight="500">
                Instrument: {sensorQuality.toUpperCase()}
              </text>
            </g>
            <g transform="translate(460, 200)">
              <rect x="0" y="0" width="200" height="40" rx="6" fill="#1e1e1e" stroke="#444" strokeWidth="1.5" />
              <text x="100" y="26" fill="#999" fontSize="18" textAnchor="middle" fontWeight="500">
                Mode: {opMode === "steady" ? "Steady" : "Transient"}
              </text>
            </g>
            {preheatActive && (
              <g transform="translate(680, 200)">
                <rect x="0" y="0" width="280" height="40" rx="6" fill="#1e1e1e" stroke={preheatColor} strokeWidth="1.5" />
                <text x="140" y="26" fill={preheatColor} fontSize="18" textAnchor="middle" fontWeight="500">
                  Preheat: {preheatStatus || "OK"}
                </text>
              </g>
            )}
          </>
        )}
      </svg>

      {/* Interactive detail panel */}
      {interactive && selectedUnit && (
        <div className="absolute top-4 right-4 bg-[#1e1e1e] border-2 border-[#444] rounded-lg p-4 max-w-[280px] shadow-xl">
          <button onClick={() => setSelectedUnit(null)} className="absolute top-2 right-2 text-[#888] hover:text-white text-sm font-bold w-6 h-6 flex items-center justify-center">✕</button>
          
          {selectedUnit === 'f1' && (
            <>
              <h4 className="text-[#aaa] text-sm font-bold mb-2">F-1 Feed Filter</h4>
              <p className="text-[#ccc] text-xs">Flow: {feedFlow.toLocaleString()} kg/h</p>
            </>
          )}
          
          {selectedUnit === 'e1' && (
            <>
              <h4 className="text-[#aaa] text-sm font-bold mb-2">E-1 Feed/Effluent Exchanger</h4>
              <p className="text-[#ccc] text-xs">Tube out: {tubeSideOutletTemp.toFixed(1)}{units}</p>
              <p className="text-[#ccc] text-xs mt-1">Shell out: {shellSideOutletTemp.toFixed(0)}{units}</p>
              {preheatActive && <p className="text-[#ccc] text-xs mt-2 font-semibold">Status: {preheatStatus}</p>}
            </>
          )}
          
          {selectedUnit === 'tcv01a' && (
            <>
              <h4 className="text-[#aaa] text-sm font-bold mb-2">TCV-01A Tube Bypass</h4>
              <p className="text-[#ccc] text-xs">Status: {valveStates.tcv01a}</p>
              {valveStates.tcv01a === "OPEN" && <p className="text-[#B47A1F] text-xs mt-2 italic">Lowers reactor inlet temperature</p>}
            </>
          )}
          
          {selectedUnit === 'tcv01b' && (
            <>
              <h4 className="text-[#aaa] text-sm font-bold mb-2">TCV-01B Feed Control</h4>
              <p className="text-[#ccc] text-xs">Status: {valveStates.tcv01b}</p>
            </>
          )}
          
          {selectedUnit === 'r1' && (
            <>
              <h4 className="text-[#aaa] text-sm font-bold mb-2">R-1 Reactor</h4>
              <p className="text-[#ccc] text-xs">Temperature: {currentTemp.toFixed(1)}{units}</p>
              <p className="text-[#ccc] text-xs mt-1">Rate: {slope.toFixed(2)} {units}/min</p>
              {bedImbalance && bedImbalance.severity !== "NONE" && (
                <>
                  <p className="text-[#ccc] text-xs mt-1">Dominant Bed: B{bedImbalance.dominantBed}</p>
                  <p className="text-[#ccc] text-xs">ΔBed: {bedImbalance.bedDelta}{units}</p>
                </>
              )}
            </>
          )}
          
          {selectedUnit === 'tcv02a' && (
            <>
              <h4 className="text-[#aaa] text-sm font-bold mb-2">TCV-02A Shell Inlet Control</h4>
              <p className="text-[#ccc] text-xs">Status: {valveStates.tcv02a}</p>
              {valveStates.tcv02a === "MODULATING" && <p className="text-[#B47A1F] text-xs mt-2 italic">Restricts shell-side heat transfer</p>}
            </>
          )}
          
          {selectedUnit === 'tcv02b' && (
            <>
              <h4 className="text-[#aaa] text-sm font-bold mb-2">TCV-02B Shell Bypass</h4>
              <p className="text-[#ccc] text-xs">Status: {valveStates.tcv02b}</p>
              {valveStates.tcv02b !== "CLOSED" && <p className="text-[#B47A1F] text-xs mt-2 italic">Reduces heat recovery</p>}
            </>
          )}
          
          {selectedUnit === 'e2' && (
            <>
              <h4 className="text-[#aaa] text-sm font-bold mb-2">E-2 Effluent Cooler</h4>
              <p className="text-[#ccc] text-xs">Capacity: {coolingCapacity}</p>
              <p className="text-[#ccc] text-xs mt-1">Status: {equipment.effluentCooler ? "Online" : "OFFLINE"}</p>
              {coolingCapacity === "CONSTRAINED" && <p className="text-[#A13A1F] text-xs mt-2 font-semibold">Heat removal limited</p>}
            </>
          )}
          
          {selectedUnit === 'tcv03a' && (
            <>
              <h4 className="text-[#aaa] text-sm font-bold mb-2">TCV-03A Cooler Bypass</h4>
              <p className="text-[#ccc] text-xs">Status: {valveStates.tcv03a}</p>
              {valveStates.tcv03a === "OPEN" && <p className="text-[#B47A1F] text-xs mt-2 italic">Bypassing cooler when not needed</p>}
            </>
          )}
          
          {selectedUnit === 'd1' && (
            <>
              <h4 className="text-[#aaa] text-sm font-bold mb-2">D-1 Three-Phase Separator</h4>
              <p className="text-[#ccc] text-xs">Separates gas, naphtha, and water</p>
              <p className="text-[#ccc] text-xs mt-1">Gas recycled to H₂ compression</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}