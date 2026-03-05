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

// LAYOUT DISCIPLINE CONSTANTS — QHD 2560×1440
// Enforces single-spine horizontal flow with upper/lower bypass zones

const Y_SPINE = 660;  // Primary horizontal axis — main process ONLY
const Y_UPPER_ZONE = Y_SPINE - 140;  // Input control zone (pre-reactor bypasses)
const Y_LOWER_ZONE = Y_SPINE + 240;  // Output control zone (post-reactor bypasses)

// MAIN PROCESS EQUIPMENT — All centered on Y_SPINE
const ANCHORS = {
  F1: { x: 260, y: Y_SPINE },
  E1: { x: 720, y: Y_SPINE },
  R1: { x: 1260, y: Y_SPINE },
  E2: { x: 1860, y: Y_SPINE },
  D1: { x: 2320, y: Y_SPINE },
};

// Equipment Sizes (bounding boxes)
const SIZES = {
  F1: { w: 90, h: 140 },
  E1: { w: 260, h: 160 },
  R1: { w: 160, h: 280 },
  E2: { w: 160, h: 180 },
  D1: { w: 280, h: 140 },
};

// CONTROL VALVES — Strictly zoned (upper = input, lower = output)
const VALVES = {
  TCV01B: { x: 500, y: Y_SPINE },           // Main feed control (on spine)
  TCV01A: { x: 640, y: Y_UPPER_ZONE },      // Tube bypass (upper zone)
  TCV02A: { x: 1580, y: Y_LOWER_ZONE + 5 }, // Shell return control (lower zone)
  TCV02B: { x: 1400, y: Y_LOWER_ZONE + 85 },// Shell bypass (lower zone)
  TCV03A: { x: ANCHORS.E2.x, y: Y_LOWER_ZONE },     // Cooler bypass (lower zone)
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
  systemState = "NORMAL", // "NORMAL" | "EARLY_DRIFT" | "IMMEDIATE_RISK"
}) {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const baseColor = LEVEL_COLORS[escalationLevel] || LEVEL_COLORS[0];
  const coolerColor = COOLING_COLORS[coolingCapacity] || COOLING_COLORS.NORMAL;
  
  // Normalize systemState (handle spacing, casing variations)
  const normalizedState = (systemState || "NORMAL")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  
  // Use explicit systemState (scenario-driven) in both modes
  const effectiveState = normalizedState;
  
  // State-driven color palettes (both modes - scenario-driven)
  const getStateColors = () => {
    // Presentation mode: designated path gets luminance bump (~15-18%), no glow/pulse
    if (effectiveState === "IMMEDIATE_RISK") {
      return {
        base: interactive ? "#555" : "#6A6A6A",
        affected: interactive ? "#C0392B" : "#C8A060", // luminance-raised amber, no glow
        affectedStroke: "4",
        pipes: interactive ? "#555" : "#6A6A6A"
      };
    } else if (effectiveState === "SEVERE_DRIFT") {
      return {
        base: interactive ? "#555" : "#6A6A6A",
        affected: interactive ? "#D4653F" : "#B89050", // luminance-raised
        affectedStroke: "4",
        pipes: interactive ? "#555" : "#6A6A6A"
      };
    } else if (effectiveState === "EARLY_DRIFT") {
      return {
        base: interactive ? "#555" : "#6A6A6A",
        affected: interactive ? "#E67E22" : "#8A8A8A", // mild luminance raise
        affectedStroke: "3.5",
        pipes: interactive ? "#555" : "#6A6A6A"
      };
    }
    // NORMAL
    return {
      base: interactive ? "#555" : "#6A6A6A",
      affected: interactive ? "#555" : "#6A6A6A",
      affectedStroke: "3.5",
      pipes: interactive ? "#555" : "#6A6A6A"
    };
  };
  
  const stateColors = getStateColors();
  
  // Adjust animation speed based on mode
  const flowSpeedMultiplier = escalationLevel === 0 ? 1.0 : escalationLevel === 1 ? 1.2 : escalationLevel === 2 ? 1.5 : 1.8;
  const baseAnimationSpeed = 8 / flowSpeedMultiplier;
  const animationSpeed = interactive ? `${baseAnimationSpeed}s` : `${baseAnimationSpeed * 1.8}s`;
  
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

  // Realistic post-cooler temperature — based on escalation state, NOT reactor temp
  const coolerOutTargets = {
    IMMEDIATE_RISK: 100,
    SEVERE_DRIFT:   80,
    EARLY_DRIFT:    60,
    NORMAL:         45,
  };
  const coolerOutTarget = coolerOutTargets[effectiveState] ?? 45;
  // Apply cooler bypass penalty: if bypassed, temperature rises toward shell-side outlet
  const coolerOutletTemp = valveStates.tcv03a === "OPEN"
    ? Math.min(coolerOutTarget + 40, shellSideOutletTemp * 0.35)
    : coolerOutTarget;
  const separatorInletTemp = coolerOutletTemp;

  // Live temperature indicator values
  const tBed = Math.round(currentTemp);
  const tOutlet = Math.round(reactorOutletTemp);
  const tQuench = Math.round(currentTemp - 8);
  const tCoolerOutlet = Math.round(separatorInletTemp);

  // Tag color based on escalation state
  const tagColors = (() => {
    if (effectiveState === "IMMEDIATE_RISK") return { text: "#D97B6C", border: "rgba(201,70,47,0.45)" };
    if (effectiveState === "SEVERE_DRIFT")   return { text: "#D4A060", border: "rgba(180,122,31,0.40)" };
    if (effectiveState === "EARLY_DRIFT")    return { text: "#C8983A", border: "rgba(180,122,31,0.22)" };
    return { text: "#bbb", border: "rgba(255,255,255,0.11)" };
  })();
  
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

  // Determine which unit is constrained (both modes - state-driven)
  const getConstrainedUnit = () => {
    if (effectiveState === "IMMEDIATE_RISK") {
      if (hotSpotRisk === "HIGH") return "reactor";
      if (!equipment.effluentCooler) return "cooler";
      return "reactor";
    }
    if (effectiveState === "SEVERE_DRIFT") {
      if (coolingCapacity === "CONSTRAINED" || !equipment.effluentCooler) return "cooler";
      return "reactor";
    }
    if (effectiveState === "EARLY_DRIFT") {
      if (preheatStatus?.includes("stress")) return "exchanger";
      return "reactor";
    }
    return null;
  };
  
  const constrainedUnit = getConstrainedUnit();
  
  // Get equipment stroke based on state
  const getEquipmentStroke = (unitType) => {
    if (!interactive && stateColors) {
      if (unitType === constrainedUnit && systemState !== "NORMAL") {
        return { color: stateColors.affected, width: stateColors.affectedStroke };
      }
      return { color: stateColors.base, width: "3" };
    }
    // Interactive mode
    if (unitType === "reactor") return { color: baseColor, width: "4" };
    if (unitType === "cooler") return { color: coolerColor, width: "3" };
    if (unitType === "exchanger") return { color: preheatColor, width: "3" };
    return { color: "#777", width: "3" };
  };
  
  // Subtle muting for non-affected equipment (both modes)
  const getNonAffectedOpacity = (unitType) => {
    if (constrainedUnit && effectiveState !== "NORMAL") {
      return unitType === constrainedUnit ? 1 : (interactive ? 0.95 : 0.92);
    }
    return 1;
  };
  
  // Path styling based on state
  const getPathStyle = () => {
    if (!interactive && stateColors) {
      return { stroke: stateColors.pipes, strokeWidth: "4", opacity: 0.9 };
    }
    return { stroke: "#555", strokeWidth: "4", opacity: 0.9 };
  };

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

        {/* === MAIN PROCESS SPINE === */}
        
        {/* FEED FILTER F-1 */}
        <g transform={`translate(${ANCHORS.F1.x}, ${ANCHORS.F1.y})`} onClick={() => handleUnitClick('f1')} className={cn(interactive && "cursor-pointer")}>
          <ellipse cx="0" cy={-SIZES.F1.h/2} rx={SIZES.F1.w/5} ry="6" fill="#1a1a1a" stroke={stateColors?.base || "#555"} strokeWidth="2.5" />
          <rect x={-SIZES.F1.w/2} y={-SIZES.F1.h/2} width={SIZES.F1.w} height={SIZES.F1.h} fill="#2a2a2a" stroke={stateColors?.base || "#555"} strokeWidth="3" filter="url(#equipmentShadow)" />
          <ellipse cx="0" cy={SIZES.F1.h/2} rx={SIZES.F1.w/5} ry="6" fill="#2a2a2a" stroke={stateColors?.base || "#555"} strokeWidth="2.5" />
          {[-30, -10, 10, 30].map(y => (
            <line key={y} x1={-SIZES.F1.w/3} y1={y} x2={SIZES.F1.w/3} y2={y} stroke="#444" strokeWidth="1.8" opacity="0.9" />
          ))}
          <text x="0" y={SIZES.F1.h/2 + 24} fill="#aaa" fontSize="22" textAnchor="middle" fontWeight="600">F-1</text>
          {interactive && (
            <>
              <text x="0" y={SIZES.F1.h/2 + 42} fill="#888" fontSize="16" textAnchor="middle">Filter</text>
              <text x="0" y={-SIZES.F1.h/2 - 16} fill="#888" fontSize="16" textAnchor="middle">{feedFlow.toLocaleString()} kg/h</text>
            </>
          )}
        </g>

        {/* SPINE: F-1 → TCV-01B */}
        <line x1={ANCHORS.F1.x + SIZES.F1.w/2} y1={Y_SPINE} x2={VALVES.TCV01B.x - 20} y2={Y_SPINE} {...getPathStyle()} />
        <circle cx={(ANCHORS.F1.x + VALVES.TCV01B.x)/2} cy={Y_SPINE} r="4" fill="#2F5D80">
          <animate attributeName="cx" values={`${ANCHORS.F1.x + SIZES.F1.w/2};${VALVES.TCV01B.x - 20}`} dur={animationSpeed} repeatCount="indefinite" />
        </circle>
        
        {/* TCV-01B: Main Feed Control (on spine) */}
        <g transform={`translate(${VALVES.TCV01B.x}, ${VALVES.TCV01B.y})`} onClick={() => handleUnitClick('tcv01b')} className={cn(interactive && "cursor-pointer")}>
          <polygon points="-9,-9 9,-9 7,0 9,9 -9,9 -7,0" fill="#2F5D80" stroke="#555" strokeWidth="2" />
          {interactive && <text x="0" y="-20" fill="#aaa" fontSize="16" textAnchor="middle" fontWeight="600">TCV-01B</text>}
        </g>
        
        {/* SPINE: TCV-01B → E-1 Tube Inlet */}
        <line x1={VALVES.TCV01B.x + 20} y1={Y_SPINE} x2={ANCHORS.E1.x - SIZES.E1.w/2} y2={Y_SPINE} {...getPathStyle()} />
        <circle cx={(VALVES.TCV01B.x + ANCHORS.E1.x)/2} cy={Y_SPINE} r="4" fill="#2F5D80">
          <animate attributeName="cx" values={`${VALVES.TCV01B.x + 20};${ANCHORS.E1.x - SIZES.E1.w/2}`} dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* MAIN EXCHANGER E-1 (Tube = Cold Feed, Shell = Hot Effluent) */}
        <g transform={`translate(${ANCHORS.E1.x}, ${ANCHORS.E1.y})`} onClick={() => handleUnitClick('e1')} className={cn(interactive && "cursor-pointer hover:opacity-90 transition-all duration-400")} opacity={getNonAffectedOpacity("exchanger")}>
          {(() => {
            const stroke = getEquipmentStroke("exchanger");
            return (
              <>
                <ellipse cx={-SIZES.E1.w/2} cy="0" rx="10" ry={SIZES.E1.h/2 - 8} fill="#1a1a1a" stroke={stroke.color} strokeWidth="2.5" className="transition-all duration-700" />
                <rect x={-SIZES.E1.w/2} y={-SIZES.E1.h/2 + 8} width={SIZES.E1.w} height={SIZES.E1.h - 16} fill="#2a2a2a" stroke={stroke.color} strokeWidth={stroke.width} filter="url(#equipmentShadow)" className="transition-all duration-700" />
                <ellipse cx={SIZES.E1.w/2} cy="0" rx="10" ry={SIZES.E1.h/2 - 8} fill="#2a2a2a" stroke={stroke.color} strokeWidth="2.5" className="transition-all duration-700" />
              </>
            );
          })()}
          
          {[-50, -35, -20, -5, 10, 25, 40, 55].map(yOffset => (
            <line key={yOffset} x1={-SIZES.E1.w/2 + 12} y1={yOffset} x2={SIZES.E1.w/2 - 12} y2={yOffset} stroke="#444" strokeWidth="1.5" opacity="0.9" />
          ))}
          
          <rect x={-SIZES.E1.w/2 + 12} y={-SIZES.E1.h/2 + 18} width={SIZES.E1.w - 24} height={SIZES.E1.h - 36} fill={tubeThermalColor} opacity="0.108" className="transition-all duration-500" />
          <rect x={-SIZES.E1.w/2 + 8} y={-SIZES.E1.h/2 + 14} width={SIZES.E1.w - 16} height={SIZES.E1.h - 28} fill={shellThermalColor} opacity="0.072" className="transition-all duration-500" />
          
          <circle cx={-SIZES.E1.w/2} cy="0" r="5" fill="#333" stroke={tubeThermalColor} strokeWidth="2" />
          <circle cx={SIZES.E1.w/2} cy="0" r="5" fill="#333" stroke={tubeThermalColor} strokeWidth="2" />
          <circle cx={-SIZES.E1.w/2} cy={-SIZES.E1.h/2 + 18} r="5" fill="#333" stroke={shellThermalColor} strokeWidth="2" />
          <circle cx={SIZES.E1.w/2} cy={SIZES.E1.h/2 - 18} r="5" fill="#333" stroke={shellThermalColor} strokeWidth="2" />
          
          <text x="0" y={SIZES.E1.h/2 + 28} fill="#aaa" fontSize="22" textAnchor="middle" fontWeight="600">E-1</text>
          {interactive && <text x="0" y={SIZES.E1.h/2 + 46} fill="#888" fontSize="16" textAnchor="middle">Exchanger</text>}
        </g>



        {/* === UPPER ZONE: INPUT CONTROL === */}
        
        {/* TCV-01A: Tube Bypass (Upper Zone) */}
        <g opacity={valveStates.tcv01a === "OOS" ? 0.3 : 1}>
          {/* Riser from spine */}
          <line x1={VALVES.TCV01B.x + 20} y1={Y_SPINE} x2={VALVES.TCV01B.x + 20} y2={Y_UPPER_ZONE} stroke="#555" strokeWidth="3" strokeDasharray="6,6" opacity="0.9" />
          {/* Horizontal run in upper zone */}
          <line x1={VALVES.TCV01B.x + 20} y1={Y_UPPER_ZONE} x2={ANCHORS.E1.x + SIZES.E1.w/2} y2={Y_UPPER_ZONE} stroke="#555" strokeWidth="3" strokeDasharray="6,6" opacity="0.9" />
          {/* Return to spine */}
          <line x1={ANCHORS.E1.x + SIZES.E1.w/2} y1={Y_UPPER_ZONE} x2={ANCHORS.E1.x + SIZES.E1.w/2} y2={Y_SPINE} stroke="#555" strokeWidth="3" strokeDasharray="6,6" opacity="0.9" />
          
          <g transform={`translate(${VALVES.TCV01A.x}, ${VALVES.TCV01A.y})`} onClick={() => handleUnitClick('tcv01a')} className={cn(interactive && "cursor-pointer")}>
            <polygon points="-9,-9 9,-9 7,0 9,9 -9,9 -7,0" fill={valveStates.tcv01a === "OPEN" ? "#2F5D80" : "#333"} stroke={valveStates.tcv01a === "OOS" ? "#A13A1F" : "#555"} strokeWidth="2" />
            {interactive && (
              <>
                <text x="0" y="-20" fill="#aaa" fontSize="16" textAnchor="middle" fontWeight="600">TCV-01A</text>
                <text x="0" y="32" fill="#888" fontSize="14" textAnchor="middle">Tube Bypass</text>
              </>
            )}
          </g>
          
          {valveStates.tcv01a === "OPEN" && (
            <circle cx={VALVES.TCV01A.x} cy={Y_UPPER_ZONE} r="4" fill="#2F5D80">
              <animate attributeName="cx" values={`${VALVES.TCV01B.x + 20};${ANCHORS.E1.x + SIZES.E1.w/2}`} dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {/* E-1 Tube Out → Reactor Inlet (Top Nozzle Entry) */}
        {/* Vertical rise from E-1 outlet to top nozzle elevation */}
        <line x1={ANCHORS.E1.x + SIZES.E1.w/2} y1={Y_SPINE} x2={ANCHORS.E1.x + SIZES.E1.w/2} y2={ANCHORS.R1.y - SIZES.R1.h/2} {...getPathStyle()} className="transition-all duration-700" />
        <circle cx={ANCHORS.E1.x + SIZES.E1.w/2} cy={(Y_SPINE + ANCHORS.R1.y - SIZES.R1.h/2)/2} r="4" fill={tubeThermalColor}>
          <animate attributeName="cy" values={`${Y_SPINE};${ANCHORS.R1.y - SIZES.R1.h/2}`} dur={animationSpeed} repeatCount="indefinite" />
        </circle>
        
        {/* Horizontal run to reactor centerline at top */}
        <line x1={ANCHORS.E1.x + SIZES.E1.w/2} y1={ANCHORS.R1.y - SIZES.R1.h/2} x2={ANCHORS.R1.x} y2={ANCHORS.R1.y - SIZES.R1.h/2} {...getPathStyle()} className="transition-all duration-700" />
        <circle cx={(ANCHORS.E1.x + SIZES.E1.w/2 + ANCHORS.R1.x)/2} cy={ANCHORS.R1.y - SIZES.R1.h/2} r="4" fill={tubeThermalColor}>
          <animate attributeName="cx" values={`${ANCHORS.E1.x + SIZES.E1.w/2};${ANCHORS.R1.x}`} dur={animationSpeed} repeatCount="indefinite" />
        </circle>
        
        {/* Short vertical nozzle penetration into reactor top */}
        <line x1={ANCHORS.R1.x} y1={ANCHORS.R1.y - SIZES.R1.h/2} x2={ANCHORS.R1.x} y2={ANCHORS.R1.y - SIZES.R1.h/2 + 22} {...getPathStyle()} className="transition-all duration-700" />
        <circle cx={ANCHORS.R1.x} cy={ANCHORS.R1.y - SIZES.R1.h/2 + 11} r="4" fill={tubeThermalColor}>
          <animate attributeName="cy" values={`${ANCHORS.R1.y - SIZES.R1.h/2};${ANCHORS.R1.y - SIZES.R1.h/2 + 22}`} dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* REACTOR R-1 — Two-Bed Configuration (Visual Anchor) */}
        <g transform={`translate(${ANCHORS.R1.x}, ${ANCHORS.R1.y})`} onClick={() => handleUnitClick('r1')} className={cn(interactive && "cursor-pointer hover:opacity-90 transition-all duration-400")} opacity={getNonAffectedOpacity("reactor")}>
          {(() => {
            const stroke = getEquipmentStroke("reactor");
            return (
              <>
                <ellipse cx="0" cy={-SIZES.R1.h/2} rx={SIZES.R1.w/2} ry="10" fill="#1a1a1a" stroke={stroke.color} strokeWidth="3" className="transition-all duration-700" />
                <rect x={-SIZES.R1.w/2} y={-SIZES.R1.h/2} width={SIZES.R1.w} height={SIZES.R1.h} fill="#2a2a2a" stroke={stroke.color} strokeWidth={stroke.width} filter="url(#equipmentShadow)" className="transition-all duration-700" />
                <ellipse cx="0" cy={SIZES.R1.h/2} rx={SIZES.R1.w/2} ry="10" fill="#2a2a2a" stroke={stroke.color} strokeWidth="3" className="transition-all duration-700" />
              </>
            );
          })()}
          
          {bedImbalance && bedImbalance.beds.map((bed, idx) => {
            const bedHeight = 70;
            const yStart = -95 + (idx * 80);
            const isDominant = bed.id === bedImbalance.dominantBed;
            
            const getBedColor = () => {
              // Use state colors in presentation mode
              if (!interactive && stateColors) {
                if (effectiveState === "IMMEDIATE_RISK" && (isDominant || escalationLevel >= 2)) {
                  return stateColors.affected; // Red/amber
                }
                if (effectiveState === "EARLY_DRIFT" && (isDominant || escalationLevel >= 1)) {
                  return stateColors.affected; // Orange
                }
                return "#3A3A3A"; // Neutral fill
              }
              // Interactive mode logic
              if (hotSpotRisk === "HIGH" && isDominant) return "#A13A1F";
              if (hotSpotRisk === "MEDIUM" && isDominant) return "#B47A1F";
              if (isDominant && bedImbalance.severity === "SEVERE") return "#A13A1F";
              if (isDominant && bedImbalance.severity === "MILD") return "#B47A1F";
              if (escalationLevel >= 2) return "#B47A1F";
              if (escalationLevel >= 1) return "#2F5D80";
              return "#0F5F5F";
            };
            
            const bedColor = getBedColor();
            const glowIntensity = interactive && isDominant && hotSpotRisk === "HIGH" ? 0.5 : interactive && isDominant && hotSpotRisk === "MEDIUM" ? 0.3 : 0;
            const bedOpacity = !interactive ? 0.12 : (0.15 + glowIntensity);
            
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
                
                {Array.from({ length: 72 }).map((_, pidx) => {
                  const row = Math.floor(pidx / 12);
                  const col = pidx % 12;
                  const px = -SIZES.R1.w/2 + 20 + col * 12;
                  const py = yStart + 10 + row * 10;
                  return (
                    <circle
                      key={pidx}
                      cx={px}
                      cy={py}
                      r="2"
                      fill={bedColor}
                      opacity={interactive ? (0.6 + glowIntensity) : 0.25}
                      className="transition-all duration-500"
                    />
                  );
                })}
                
                {interactive && (
                  <text x={-SIZES.R1.w/2 - 20} y={yStart + bedHeight / 2 + 4} fill="#666" fontSize="18" textAnchor="middle">B{bed.id}</text>
                )}
                
                {idx < bedImbalance.beds.length - 1 && (
                  <g>
                    {/* H₂ Quench — From right-side header */}
                    <line x1={SIZES.R1.w/2} y1={yStart + bedHeight + 3} x2={SIZES.R1.w/2 + 40} y2={yStart + bedHeight + 3} stroke={equipment.h2Compressor ? "#4A90E2" : "#888"} strokeWidth="1.5" strokeDasharray="3,3" opacity="0.5" />
                    <circle cx={SIZES.R1.w/2 + 20} cy={yStart + bedHeight + 3} r="2.5" fill={equipment.h2Compressor ? "#4A90E2" : "#888"} opacity="0.6">
                      {equipment.h2Compressor && interactive && (
                        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2.5s" repeatCount="indefinite" />
                      )}
                    </circle>
                    {interactive && (
                      <text x={SIZES.R1.w/2 + 48} y={yStart + bedHeight + 7} fill="#888" fontSize="13" textAnchor="start" opacity="0.5">Q{idx + 1}</text>
                    )}
                  </g>
                )}
              </g>
            );
          })}
          
          {/* Glow effect only in interactive mode */}
          {interactive && escalationLevel >= 2 && (
            <rect x={-SIZES.R1.w/2 + 5} y={-SIZES.R1.h/2 + 5} width={SIZES.R1.w - 10} height={SIZES.R1.h - 10} fill="url(#reactorGlow)" opacity="0.15" className="transition-opacity duration-500" />
          )}
          
          <text x={-SIZES.R1.w/2 - 40} y={SIZES.R1.h/2 + 12} fill="#aaa" fontSize="22" textAnchor="end" fontWeight="bold">R-1</text>
          {interactive && <text x={-SIZES.R1.w/2 - 40} y={SIZES.R1.h/2 + 26} fill="#888" fontSize="18" textAnchor="end">Reactor</text>}
        </g>

        {/* R-1 Outlet — Drops vertically before split */}
        {interactive && (
          <>
            <text x={ANCHORS.R1.x + SIZES.R1.w/2 + 120} y={ANCHORS.R1.y - SIZES.R1.h/2 + 12} fill="#888" fontSize="18" textAnchor="start">Outlet</text>
            <text x={ANCHORS.R1.x + SIZES.R1.w/2 + 120} y={ANCHORS.R1.y - SIZES.R1.h/2 + 32} fill={baseColor} fontSize="20" textAnchor="start" fontWeight="700" className="transition-colors duration-400">
              {currentTemp.toFixed(1)}{units}
            </text>
            {slope > 0 && (
              <text x={ANCHORS.R1.x + SIZES.R1.w/2 + 120} y={ANCHORS.R1.y - SIZES.R1.h/2 + 50} fill={baseColor} fontSize="16" textAnchor="start" className="transition-colors duration-400">
                ΔT +{slope.toFixed(2)} {units}/min
              </text>
            )}
          </>
        )}

        {/* === SHELL-SIDE OUTLET: REACTOR → LOWER ZONE === */}
        
        {/* Reactor outlet — Vertical drop to split point */}
        <line x1={ANCHORS.R1.x} y1={ANCHORS.R1.y + SIZES.R1.h/2} x2={ANCHORS.R1.x} y2={Y_LOWER_ZONE - 20} {...getPathStyle()} className="transition-all duration-700" />
        <circle cx={ANCHORS.R1.x} cy={ANCHORS.R1.y + SIZES.R1.h/2 + 30} r="4" fill={shellThermalColor}>
          <animate attributeName="cy" values={`${ANCHORS.R1.y + SIZES.R1.h/2};${Y_LOWER_ZONE - 20}`} dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* Split point — BELOW reactor body */}
        <circle cx={ANCHORS.R1.x} cy={Y_LOWER_ZONE - 20} r="6" fill="#1a1a1a" stroke="#555" strokeWidth="2" />

        {/* === LOWER ZONE: SHELL-SIDE CONTROL === */}
        
        {/* TCV-02A Path: Shell Return Control (Lane A) */}
        <g>
          {/* Branch A: From split point horizontal to valve X, then drop to bus A */}
          <line x1={ANCHORS.R1.x} y1={Y_LOWER_ZONE - 20} x2={VALVES.TCV02A.x} y2={Y_LOWER_ZONE - 20} stroke="#555" strokeWidth="3" opacity="0.9" />
          {valveStates.tcv02a !== "CLOSED" && (
            <circle cx={(ANCHORS.R1.x + VALVES.TCV02A.x)/2} cy={Y_LOWER_ZONE - 20} r="4" fill={shellThermalColor}>
              <animate attributeName="cx" values={`${ANCHORS.R1.x};${VALVES.TCV02A.x}`} dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
          
          {/* Vertical drop to bus A level */}
          <line x1={VALVES.TCV02A.x} y1={Y_LOWER_ZONE - 20} x2={VALVES.TCV02A.x} y2={Y_LOWER_ZONE + 5} stroke="#555" strokeWidth="3" opacity="0.9" />
          
          {/* Valve symbol */}
          <g transform={`translate(${VALVES.TCV02A.x}, ${VALVES.TCV02A.y})`} onClick={() => handleUnitClick('tcv02a')} className={cn(interactive && "cursor-pointer")}>
            <polygon points="-9,-9 9,-9 7,0 9,9 -9,9 -7,0" fill={valveStates.tcv02a === "OPEN" ? "#2F5D80" : "#B47A1F"} stroke="#555" strokeWidth="2" />
            {interactive && (
              <>
                <text x="0" y="-20" fill="#aaa" fontSize="16" textAnchor="middle" fontWeight="600">TCV-02A</text>
                <text x="0" y="-36" fill="#888" fontSize="14" textAnchor="middle">Shell Return</text>
              </>
            )}
          </g>
          
          {/* Horizontal run on bus A to E-1 shell inlet x-position */}
          <line x1={VALVES.TCV02A.x} y1={Y_LOWER_ZONE + 5} x2={ANCHORS.E1.x + SIZES.E1.w/2} y2={Y_LOWER_ZONE + 5} stroke="#555" strokeWidth="3" opacity="0.9" />
          {valveStates.tcv02a !== "CLOSED" && (
            <circle cx={(VALVES.TCV02A.x + ANCHORS.E1.x + SIZES.E1.w/2)/2} cy={Y_LOWER_ZONE + 5} r="4" fill={shellThermalColor}>
              <animate attributeName="cx" values={`${VALVES.TCV02A.x};${ANCHORS.E1.x + SIZES.E1.w/2}`} dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
          
          {/* Rise vertically to E-1 shell inlet elevation */}
          <line x1={ANCHORS.E1.x + SIZES.E1.w/2} y1={Y_LOWER_ZONE + 5} x2={ANCHORS.E1.x + SIZES.E1.w/2} y2={ANCHORS.E1.y + SIZES.E1.h/2 - 18} stroke="#555" strokeWidth="3" opacity="0.9" />
        </g>

        {/* TCV-02B Path: Shell Bypass (Lane B) — Bypasses E-1, merges to E-2 line */}
        <g opacity={valveStates.tcv02b === "CLOSED" ? 0.3 : 1}>
          {/* Branch B: From split point horizontal to valve X, then drop to bus B */}
          <line x1={ANCHORS.R1.x} y1={Y_LOWER_ZONE - 20} x2={VALVES.TCV02B.x} y2={Y_LOWER_ZONE - 20} stroke="#555" strokeWidth="3" strokeDasharray="6,6" opacity="0.9" />
          {valveStates.tcv02b !== "CLOSED" && (
            <circle cx={(ANCHORS.R1.x + VALVES.TCV02B.x)/2} cy={Y_LOWER_ZONE - 20} r="4" fill="#B47A1F">
              <animate attributeName="cx" values={`${ANCHORS.R1.x};${VALVES.TCV02B.x}`} dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
          
          {/* Vertical drop to bus B level */}
          <line x1={VALVES.TCV02B.x} y1={Y_LOWER_ZONE - 20} x2={VALVES.TCV02B.x} y2={Y_LOWER_ZONE + 85} stroke="#555" strokeWidth="3" strokeDasharray="6,6" opacity="0.9" />
          
          {/* Valve symbol */}
          <g transform={`translate(${VALVES.TCV02B.x}, ${VALVES.TCV02B.y})`} onClick={() => handleUnitClick('tcv02b')} className={cn(interactive && "cursor-pointer")}>
            <polygon points="-9,-9 9,-9 7,0 9,9 -9,9 -7,0" fill={valveStates.tcv02b === "OPEN" ? "#B47A1F" : "#333"} stroke="#555" strokeWidth="2" />
            {interactive && (
              <>
                <text x="0" y="32" fill="#aaa" fontSize="16" textAnchor="middle" fontWeight="600">TCV-02B</text>
                <text x="0" y="48" fill="#888" fontSize="14" textAnchor="middle">Shell Bypass</text>
              </>
            )}
          </g>
          
          {/* After valve: Horizontal run on bus B to merge point before E-2 */}
          <line x1={VALVES.TCV02B.x} y1={Y_LOWER_ZONE + 85} x2={ANCHORS.E2.x - SIZES.E2.w/2 - 70} y2={Y_LOWER_ZONE + 85} stroke="#555" strokeWidth="3" strokeDasharray="6,6" opacity="0.9" />
          {valveStates.tcv02b !== "CLOSED" && (
            <circle cx={(VALVES.TCV02B.x + ANCHORS.E2.x - SIZES.E2.w/2 - 70)/2} cy={Y_LOWER_ZONE + 85} r="4" fill="#B47A1F">
              <animate attributeName="cx" values={`${VALVES.TCV02B.x};${ANCHORS.E2.x - SIZES.E2.w/2 - 70}`} dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
          
          {/* Rise vertically to spine */}
          <line x1={ANCHORS.E2.x - SIZES.E2.w/2 - 70} y1={Y_LOWER_ZONE + 85} x2={ANCHORS.E2.x - SIZES.E2.w/2 - 70} y2={Y_SPINE} stroke="#555" strokeWidth="3" strokeDasharray="6,6" opacity="0.9" />
          {valveStates.tcv02b !== "CLOSED" && (
            <circle cx={ANCHORS.E2.x - SIZES.E2.w/2 - 70} cy={(Y_LOWER_ZONE + 85 + Y_SPINE)/2} r="4" fill="#B47A1F">
              <animate attributeName="cy" values={`${Y_LOWER_ZONE + 85};${Y_SPINE}`} dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
          
          {/* Horizontal run on spine to E-2 inlet */}
          <line x1={ANCHORS.E2.x - SIZES.E2.w/2 - 70} y1={Y_SPINE} x2={ANCHORS.E2.x - SIZES.E2.w/2} y2={Y_SPINE} stroke="#555" strokeWidth="3" strokeDasharray="6,6" opacity="0.9" />
          
          {/* Merge node indicator */}
          <circle cx={ANCHORS.E2.x - SIZES.E2.w/2 - 70} cy={Y_SPINE} r="5" fill="#1a1a1a" stroke="#B47A1F" strokeWidth="2" />
        </g>

        {/* SPINE: E-1 Shell Out → E-2 */}
        {/* Vertical rise from E-1 shell outlet to upper corridor */}
        <line x1={ANCHORS.E1.x + SIZES.E1.w/2} y1={ANCHORS.E1.y + SIZES.E1.h/2 - 18} x2={ANCHORS.E1.x + SIZES.E1.w/2} y2={Y_UPPER_ZONE - 60} stroke="#555" strokeWidth="4" opacity="0.9" />
        {/* Horizontal run in upper corridor above reactor */}
        <line x1={ANCHORS.E1.x + SIZES.E1.w/2} y1={Y_UPPER_ZONE - 60} x2={ANCHORS.E2.x - SIZES.E2.w/2} y2={Y_UPPER_ZONE - 60} stroke="#555" strokeWidth="4" opacity="0.9" />
        {/* Vertical drop to E-2 inlet on spine */}
        <line x1={ANCHORS.E2.x - SIZES.E2.w/2} y1={Y_UPPER_ZONE - 60} x2={ANCHORS.E2.x - SIZES.E2.w/2} y2={Y_SPINE} stroke="#555" strokeWidth="4" opacity="0.9" />
        <circle cx={(ANCHORS.E1.x + SIZES.E1.w/2 + ANCHORS.E2.x - SIZES.E2.w/2)/2} cy={Y_UPPER_ZONE - 60} r="4" fill={getThermalColor(shellSideOutletTemp)}>
          <animate attributeName="cx" values={`${ANCHORS.E1.x + SIZES.E1.w/2};${ANCHORS.E2.x - SIZES.E2.w/2}`} dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* EFFLUENT COOLER E-2 */}
        <g transform={`translate(${ANCHORS.E2.x}, ${ANCHORS.E2.y})`} onClick={() => handleUnitClick('e2')} className={cn(interactive && "cursor-pointer hover:opacity-90 transition-all duration-400", interactive && coolingCapacity === "CONSTRAINED" && "animate-[wiggle_2s_ease-in-out_infinite]")} opacity={getNonAffectedOpacity("cooler")}>
          {(() => {
            const stroke = getEquipmentStroke("cooler");
            return (
              <rect x={-SIZES.E2.w/2} y={-SIZES.E2.h/2} width={SIZES.E2.w} height={SIZES.E2.h} rx="10" fill="#2a2a2a" stroke={stroke.color} strokeWidth={stroke.width} filter="url(#equipmentShadow)" className="transition-all duration-700" />
            );
          })()}
          {[-60, -40, -20, 0, 20, 40, 60].map(y => (
            <line key={y} x1={-SIZES.E2.w/2 + 16} y1={y} x2={SIZES.E2.w/2 - 16} y2={y} stroke="#2F5D80" strokeWidth="2.5" opacity="0.54" />
          ))}
          {!equipment.effluentCooler && (
            <>
              <line x1={-SIZES.E2.w/2 + 10} y1={-SIZES.E2.h/2 + 10} x2={SIZES.E2.w/2 - 10} y2={SIZES.E2.h/2 - 10} stroke="#A13A1F" strokeWidth="4" />
              <line x1={SIZES.E2.w/2 - 10} y1={-SIZES.E2.h/2 + 10} x2={-SIZES.E2.w/2 + 10} y2={SIZES.E2.h/2 - 10} stroke="#A13A1F" strokeWidth="4" />
            </>
          )}
          <text x="0" y={SIZES.E2.h/2 + 28} fill="#aaa" fontSize="22" textAnchor="middle" fontWeight="600">E-2</text>
          {interactive && <text x="0" y={SIZES.E2.h/2 + 46} fill="#888" fontSize="16" textAnchor="middle">Cooler</text>}
        </g>

        {/* TCV-03A: Cooler Bypass (Lower Zone) */}
        <g opacity={valveStates.tcv03a === "CLOSED" ? 0.3 : 1}>
          {/* Drop from spine */}
          <line x1={ANCHORS.E2.x - SIZES.E2.w/2} y1={Y_SPINE} x2={ANCHORS.E2.x - SIZES.E2.w/2} y2={Y_LOWER_ZONE} stroke="#555" strokeWidth="3" strokeDasharray="6,6" opacity="0.9" />
          {/* Horizontal run in lower zone */}
          <line x1={ANCHORS.E2.x - SIZES.E2.w/2} y1={Y_LOWER_ZONE} x2={ANCHORS.E2.x + SIZES.E2.w/2} y2={Y_LOWER_ZONE} stroke="#555" strokeWidth="3" strokeDasharray="6,6" opacity="0.9" />
          {/* Rise to spine */}
          <line x1={ANCHORS.E2.x + SIZES.E2.w/2} y1={Y_LOWER_ZONE} x2={ANCHORS.E2.x + SIZES.E2.w/2} y2={Y_SPINE} stroke="#555" strokeWidth="3" strokeDasharray="6,6" opacity="0.9" />
          
          <g transform={`translate(${VALVES.TCV03A.x}, ${VALVES.TCV03A.y})`} onClick={() => handleUnitClick('tcv03a')} className={cn(interactive && "cursor-pointer")}>
            <polygon points="-9,-9 9,-9 7,0 9,9 -9,9 -7,0" fill={valveStates.tcv03a === "OPEN" ? "#B47A1F" : "#333"} stroke="#555" strokeWidth="2" />
            {interactive && (
              <>
                <text x="0" y="28" fill="#aaa" fontSize="16" textAnchor="middle" fontWeight="600">TCV-03A</text>
                <text x="0" y="44" fill="#888" fontSize="14" textAnchor="middle">Cooler Bypass</text>
              </>
            )}
          </g>
          
          {valveStates.tcv03a === "OPEN" && (
            <circle cx={VALVES.TCV03A.x} cy={Y_LOWER_ZONE} r="4" fill="#B47A1F">
              <animate attributeName="cx" values={`${ANCHORS.E2.x - SIZES.E2.w/2};${ANCHORS.E2.x + SIZES.E2.w/2}`} dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {/* SPINE: E-2 → D-1 */}
        <line x1={ANCHORS.E2.x + SIZES.E2.w/2} y1={Y_SPINE} x2={ANCHORS.D1.x - SIZES.D1.w/2} y2={Y_SPINE} {...getPathStyle()} />
        <circle cx={(ANCHORS.E2.x + ANCHORS.D1.x)/2} cy={Y_SPINE} r="4" fill={cooledThermalColor}>
          <animate attributeName="cx" values={`${ANCHORS.E2.x + SIZES.E2.w/2};${ANCHORS.D1.x - SIZES.D1.w/2}`} dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* THREE-PHASE SEPARATOR D-1 — Terminal Unit */}
        <g transform={`translate(${ANCHORS.D1.x}, ${ANCHORS.D1.y})`} onClick={() => handleUnitClick('d1')} className={cn(interactive && "cursor-pointer hover:opacity-90 transition-all duration-400")} opacity={getNonAffectedOpacity("separator")}>
          <ellipse cx={-SIZES.D1.w/2} cy="0" rx="10" ry={SIZES.D1.h/2 - 4} fill="#1a1a1a" stroke={stateColors?.base || "#555"} strokeWidth="3" className="transition-all duration-700" />
          <rect x={-SIZES.D1.w/2} y={-SIZES.D1.h/2 + 4} width={SIZES.D1.w} height={SIZES.D1.h - 8} fill="#2a2a2a" stroke={stateColors?.base || "#555"} strokeWidth="3" filter="url(#equipmentShadow)" className="transition-all duration-700" />
          <ellipse cx={SIZES.D1.w/2} cy="0" rx="10" ry={SIZES.D1.h/2 - 4} fill="#2a2a2a" stroke={stateColors?.base || "#555"} strokeWidth="3" className="transition-all duration-700" />
          
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
          
          {/* Gas outlet — Vertical only */}
          <line x1="0" y1={-SIZES.D1.h/2 + 4} x2="0" y2={-SIZES.D1.h/2 - 50} stroke="#888" strokeWidth="2.5" />
          {interactive && <text x="0" y={-SIZES.D1.h/2 - 58} fill="#888" fontSize="16" textAnchor="middle">Gas</text>}
          
          {/* Naphtha outlet */}
          <line x1={SIZES.D1.w/2} y1={-SIZES.D1.h/2 + 52} x2={SIZES.D1.w/2 + 30} y2={-SIZES.D1.h/2 + 52} stroke="#D4A547" strokeWidth="2.5" />
          
          <text x="0" y={SIZES.D1.h/2 + 28} fill="#aaa" fontSize="22" textAnchor="middle" fontWeight="600">D-1</text>
          {interactive && <text x="85" y="55" fill="#888" fontSize="16" textAnchor="middle">Separator</text>}
        </g>

        {/* H₂O Pot (below separator) */}
        <g transform={`translate(${ANCHORS.D1.x}, ${ANCHORS.D1.y + SIZES.D1.h/2 + 10})`}>
          <ellipse cx="0" cy="0" rx="18" ry="5" fill="#1a1a1a" stroke="#555" strokeWidth="2.5" />
          <rect x="-18" y="0" width="36" height="60" fill="#2a2a2a" stroke="#555" strokeWidth="2.5" />
          <ellipse cx="0" cy="60" rx="18" ry="5" fill="#2a2a2a" stroke="#555" strokeWidth="2.5" />
          <line x1="0" y1="-5" x2="0" y2="0" stroke="#2F5D80" strokeWidth="2.5" />
          <rect x="-15" y="36" width="30" height="16" fill="#2F5D80" opacity="0.25" />
          <line x1="-12" y1="46" x2="12" y2="46" stroke="#2F5D80" strokeWidth="2" opacity="0.6" />
          {interactive && <text x="0" y="80" fill="#888" fontSize="14" textAnchor="middle">H₂O</text>}
        </g>

        {/* === SUPPORT SYSTEMS === */}
        
        {/* H₂ System — Right-side header with quench branches */}
        <g opacity="0.4">
          {/* H₂ header — vertical dashed blue line on right side */}
          <line 
            x1={ANCHORS.R1.x + SIZES.R1.w/2 + 40} 
            y1={ANCHORS.R1.y - SIZES.R1.h/2 - 30} 
            x2={ANCHORS.R1.x + SIZES.R1.w/2 + 40} 
            y2={ANCHORS.R1.y + SIZES.R1.h/2 - 10} 
            stroke="#4A90E2" 
            strokeWidth="2.5" 
            strokeDasharray="4,4" 
          />
          {interactive && (
            <text 
              x={ANCHORS.R1.x + SIZES.R1.w/2 + 40} 
              y={ANCHORS.R1.y - SIZES.R1.h/2 - 38} 
              fill="#888" 
              fontSize="14" 
              textAnchor="middle"
            >
              H₂
            </text>
          )}
          
          {/* Gas recycle to H₂ system */}
          <line x1={ANCHORS.D1.x} y1={ANCHORS.D1.y - SIZES.D1.h/2 - 50} x2={ANCHORS.D1.x} y2={ANCHORS.D1.y - SIZES.D1.h/2 - 90} stroke="#4A90E2" strokeWidth="2" strokeDasharray="4,4" />
          {interactive && <text x={ANCHORS.D1.x} y={ANCHORS.D1.y - SIZES.D1.h/2 - 98} fill="#888" fontSize="14" textAnchor="middle">H₂ System</text>}
        </g>


        {/* === STATIC TEMPERATURE INDICATORS === */}
        {/* T-bed: Upper bed area, left of reactor */}
        <g transform="translate(1075, 590)">
          <rect x="-52" y="-20" width="104" height="56" rx="5" fill="#0D1117" stroke={tagColors.border} strokeWidth="1.5" />
          <text x="0" y="-5" fill="#666" fontSize="13" textAnchor="middle" letterSpacing="0.04em">T-BED</text>
          <text x="0" y="13" fill={tagColors.text} fontSize="17" textAnchor="middle" fontWeight="600">{tBed}°C</text>
          <text x="0" y="28" fill="#444" fontSize="11" textAnchor="middle">HI 360 · HIHI 370°C</text>
        </g>

        {/* Reactor Outlet Temp: right of reactor outlet nozzle */}
        <g transform="translate(1390, 835)">
          <rect x="-64" y="-20" width="128" height="56" rx="5" fill="#0D1117" stroke={tagColors.border} strokeWidth="1.5" />
          <text x="0" y="-5" fill="#666" fontSize="13" textAnchor="middle" letterSpacing="0.04em">RXT OUTLET</text>
          <text x="0" y="13" fill={tagColors.text} fontSize="17" textAnchor="middle" fontWeight="600">{tOutlet}°C</text>
          <text x="0" y="28" fill="#444" fontSize="11" textAnchor="middle">HI 370 · HIHI 380°C</text>
        </g>

        {/* Quench Zone Temp: right of reactor mid-section (inter-bed quench zone) */}
        <g transform="translate(1460, 660)">
          <rect x="-60" y="-20" width="120" height="56" rx="5" fill="#0D1117" stroke={tagColors.border} strokeWidth="1.5" />
          <text x="0" y="-5" fill="#666" fontSize="13" textAnchor="middle" letterSpacing="0.04em">QUENCH ZONE</text>
          <text x="0" y="13" fill={tagColors.text} fontSize="17" textAnchor="middle" fontWeight="600">{tQuench}°C</text>
          <text x="0" y="28" fill="#444" fontSize="11" textAnchor="middle">HI 355 · HIHI 365°C</text>
        </g>

        {/* Feed Cooler Outlet Temp: above spine between E-2 and D-1 */}
        <g transform="translate(2080, 614)">
          <rect x="-66" y="-20" width="132" height="56" rx="5" fill="#0D1117" stroke={tagColors.border} strokeWidth="1.5" />
          <text x="0" y="-5" fill="#666" fontSize="13" textAnchor="middle" letterSpacing="0.04em">COOLER OUTLET</text>
          <text x="0" y="13" fill={tagColors.text} fontSize="17" textAnchor="middle" fontWeight="600">{tCoolerOutlet}°C</text>
          <text x="0" y="28" fill="#444" fontSize="11" textAnchor="middle">HI 90 · HIHI 100°C</text>
        </g>

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
              <p className="text-[#ccc] text-xs">Capacity: {coolingCapacity === "SEVERELY_LIMITED" ? "Severely Limited" : coolingCapacity === "REDUCED" ? "Reduced" : "Normal"}</p>
              <p className="text-[#ccc] text-xs mt-1">Status: {equipment.effluentCooler ? "Online" : "OFFLINE"}</p>
              {coolingCapacity === "SEVERELY_LIMITED" && <p className="text-[#A13A1F] text-xs mt-2 font-semibold">Heat removal severely limited</p>}
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