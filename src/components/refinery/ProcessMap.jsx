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
  
  // Flow speed based on escalation
  const flowSpeedMultiplier = escalationLevel === 0 ? 1.0 : escalationLevel === 1 ? 1.2 : escalationLevel === 2 ? 1.5 : 1.8;
  const animationSpeed = `${8 / flowSpeedMultiplier}s`;
  
  // Valve states
  const valveStates = {
    tcv01a: equipment.bypassValve ? "CLOSED" : "OOS", // Feed tube bypass
    tcv01b: "OPEN", // Primary feed control
    tcv02a: escalationLevel >= 2 && !equipment.preheatExchanger ? "MODULATING" : "OPEN", // Shell inlet
    tcv02b: equipment.bypassValve && escalationLevel >= 2 ? "MODULATING" : "CLOSED", // Shell bypass
    tcv03a: coolingCapacity === "CONSTRAINED" ? "OPEN" : "CLOSED", // Cooler bypass
  };

  const preheatColor = preheatActive && preheatStatus?.includes("stress") ? "#A13A1F" 
    : preheatActive && preheatStatus?.includes("Warning") ? "#B47A1F" 
    : "#0F5F5F";

  const handleUnitClick = (unit) => {
    if (!interactive) return;
    setSelectedUnit(selectedUnit === unit ? null : unit);
  };

  // Thermal calculations
  const reactorOutletTemp = currentTemp + 15;
  const tubeSideOutletTemp = valveStates.tcv01a === "OPEN" ? currentTemp * 0.85 : currentTemp;
  const shellSideOutletTemp = valveStates.tcv02b === "OPEN" ? reactorOutletTemp * 0.95 : Math.max(reactorOutletTemp - 50, 280);
  const coolerOutletTemp = valveStates.tcv03a === "OPEN" ? shellSideOutletTemp : Math.max(shellSideOutletTemp - 40, 240);
  
  // Thermal colors
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
      <svg viewBox="0 0 1200 540" className="w-full h-auto">
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
        <g transform="translate(60, 260)" onClick={() => handleUnitClick('f1')} className={cn(interactive && "cursor-pointer")}>
          <ellipse cx="0" cy="-15" rx="18" ry="6" fill="#1a1a1a" stroke="#555" strokeWidth="2" />
          <rect x="-18" y="-15" width="36" height="50" fill="#2a2a2a" stroke="#555" strokeWidth="2" filter="url(#equipmentShadow)" />
          <ellipse cx="0" cy="35" rx="18" ry="6" fill="#2a2a2a" stroke="#555" strokeWidth="2" />
          {/* Filter media */}
          {[-8, 0, 8, 16].map(y => (
            <line key={y} x1="-14" y1={y} x2="14" y2={y} stroke="#444" strokeWidth="1.5" />
          ))}
          <text x="0" y="55" fill="#aaa" fontSize="11" textAnchor="middle" fontWeight="600">F-1</text>
          {interactive && (
            <>
              <text x="0" y="67" fill="#888" fontSize="9" textAnchor="middle">Filter</text>
              <text x="0" y="-35" fill="#999" fontSize="10" textAnchor="middle">{feedFlow.toLocaleString()} kg/h</text>
            </>
          )}
        </g>

        {/* PIPE: F-1 to TCV-01B */}
        <line x1="78" y1="260" x2="135" y2="260" stroke="#555" strokeWidth="4" />
        <circle cx="100" cy="260" r="4" fill="#2F5D80">
          <animate attributeName="cx" values="78;135" dur={animationSpeed} repeatCount="indefinite" />
        </circle>
        
        {/* TCV-01B: Primary Feed Control */}
        <g transform="translate(155, 260)" onClick={() => handleUnitClick('tcv01b')} className={cn(interactive && "cursor-pointer")}>
          <polygon points="-10,-10 10,-10 8,0 10,10 -10,10 -8,0" fill="#2F5D80" stroke="#555" strokeWidth="2" />
          <text x="0" y="-20" fill="#aaa" fontSize="9" textAnchor="middle" fontWeight="600">TCV-01B</text>
        </g>
        
        {/* PIPE: TCV-01B to E-1 Tube Inlet */}
        <line x1="165" y1="260" x2="185" y2="260" stroke="#555" strokeWidth="4" />
        <circle cx="175" cy="260" r="3" fill="#2F5D80">
          <animate attributeName="cx" values="165;185" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* FEED/EFFLUENT HEAT EXCHANGER E-1 */}
        <g transform="translate(250, 260)" onClick={() => handleUnitClick('e1')} className={cn(interactive && "cursor-pointer hover:opacity-90 transition-all duration-400")}>
          {/* Shell body */}
          <ellipse cx="-50" cy="0" rx="10" ry="38" fill="#1a1a1a" stroke={preheatColor} strokeWidth="2.5" />
          <rect x="-50" y="-38" width="100" height="76" fill="#2a2a2a" stroke={preheatColor} strokeWidth="3" filter="url(#equipmentShadow)" />
          <ellipse cx="50" cy="0" rx="10" ry="38" fill="#2a2a2a" stroke={preheatColor} strokeWidth="2.5" />
          
          {/* Tube bundle (many small tubes) */}
          {[-28, -20, -12, -4, 4, 12, 20, 28].map(yOffset => (
            <line key={yOffset} x1="-45" y1={yOffset} x2="45" y2={yOffset} stroke="#444" strokeWidth="1.2" />
          ))}
          
          {/* Tube side thermal glow */}
          <rect x="-45" y="-30" width="90" height="60" fill={tubeThermalColor} opacity="0.12" className="transition-all duration-500" />
          
          {/* Shell side thermal glow */}
          <rect x="-48" y="-36" width="96" height="72" fill={shellThermalColor} opacity="0.08" className="transition-all duration-500" />
          
          {/* Nozzles */}
          <circle cx="-50" cy="0" r="5" fill="#333" stroke={tubeThermalColor} strokeWidth="1.5" />
          <circle cx="50" cy="0" r="5" fill="#333" stroke={tubeThermalColor} strokeWidth="1.5" />
          <circle cx="-50" cy="-32" r="5" fill="#333" stroke={shellThermalColor} strokeWidth="1.5" />
          <circle cx="50" cy="32" r="5" fill="#333" stroke={shellThermalColor} strokeWidth="1.5" />
          
          <text x="0" y="60" fill="#aaa" fontSize="11" textAnchor="middle" fontWeight="600">E-1</text>
          {interactive && <text x="0" y="72" fill="#888" fontSize="9" textAnchor="middle">Shell & Tube HX</text>}
        </g>

        {/* E-1 Temperature Labels (no overlap) */}
        {interactive && (
          <>
            <text x="185" y="232" fill="#888" fontSize="8" textAnchor="middle">E-1 Tube Out</text>
            <text x="185" y="244" fill={tubeThermalColor} fontSize="10" textAnchor="middle" fontWeight="500" className="transition-colors duration-500">
              T = {tubeSideOutletTemp.toFixed(1)}{units}
            </text>
            <text x="200" y="310" fill="#888" fontSize="8" textAnchor="middle">E-1 Shell In</text>
            <text x="200" y="322" fill={shellThermalColor} fontSize="9" textAnchor="middle" className="transition-colors duration-500">
              T = {reactorOutletTemp.toFixed(0)}{units}
            </text>
            <text x="200" y="200" fill="#888" fontSize="8" textAnchor="middle">E-1 Shell Out</text>
            <text x="200" y="212" fill={getThermalColor(shellSideOutletTemp)} fontSize="9" textAnchor="middle" className="transition-colors duration-500">
              T = {shellSideOutletTemp.toFixed(0)}{units}
            </text>
          </>
        )}

        {/* TUBE BYPASS (TCV-01A) - positioned ABOVE E-1 */}
        <g opacity={valveStates.tcv01a === "OOS" ? 0.3 : 1}>
          <line x1="135" y1="260" x2="135" y2="210" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          <line x1="135" y1="210" x2="320" y2="210" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          <line x1="320" y1="210" x2="320" y2="260" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          
          <g transform="translate(225, 210)" onClick={() => handleUnitClick('tcv01a')} className={cn(interactive && "cursor-pointer")}>
            <polygon points="-10,-8 10,-8 8,0 10,8 -10,8 -8,0" fill={valveStates.tcv01a === "OPEN" ? "#2F5D80" : "#333"} stroke={valveStates.tcv01a === "OOS" ? "#A13A1F" : "#555"} strokeWidth="2" />
            <text x="0" y="-18" fill="#aaa" fontSize="9" textAnchor="middle" fontWeight="600">TCV-01A</text>
            {interactive && <text x="0" y="26" fill="#888" fontSize="8" textAnchor="middle">Tube Bypass</text>}
          </g>
          
          {valveStates.tcv01a === "OPEN" && (
            <circle cx="180" cy="210" r="3" fill="#2F5D80">
              <animate attributeName="cx" values="135;320" dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {/* PIPE: E-1 Tube Out to Reactor */}
        <line x1="300" y1="260" x2="370" y2="260" stroke="#555" strokeWidth="4" />
        <circle cx="335" cy="260" r="4" fill={tubeThermalColor}>
          <animate attributeName="cx" values="300;370" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* REACTOR R-1 with Catalyst Particles */}
        <g transform="translate(440, 280)" onClick={() => handleUnitClick('r1')} className={cn(interactive && "cursor-pointer hover:opacity-90 transition-all duration-400")}>
          {/* Vessel shell */}
          <ellipse cx="0" cy="-80" rx="48" ry="10" fill="#1a1a1a" stroke={baseColor} strokeWidth="2.5" />
          <rect x="-48" y="-80" width="96" height="160" fill="#2a2a2a" stroke={baseColor} strokeWidth="4" filter="url(#equipmentShadow)" />
          <ellipse cx="0" cy="80" rx="48" ry="10" fill="#2a2a2a" stroke={baseColor} strokeWidth="2.5" />
          
          {/* Catalyst beds with small particles */}
          {bedImbalance && bedImbalance.beds.map((bed, idx) => {
            const yStart = -60 + (idx * 50);
            const yEnd = yStart + 40;
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
            
            // Create many small catalyst particles
            const particles = [];
            for (let row = 0; row < 6; row++) {
              for (let col = 0; col < 12; col++) {
                const px = -38 + col * 7;
                const py = yStart + row * 7;
                particles.push({ x: px, y: py });
              }
            }
            
            return (
              <g key={bed.id}>
                {/* Bed boundary */}
                <rect x="-42" y={yStart} width="84" height="42" fill="none" stroke="#333" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.3" />
                
                {/* Catalyst particles */}
                {particles.map((p, pidx) => (
                  <circle
                    key={pidx}
                    cx={p.x}
                    cy={p.y}
                    r="2"
                    fill={bedColor}
                    opacity={0.6 + glowIntensity}
                    className="transition-all duration-500"
                  />
                ))}
                
                {/* Bed label */}
                {interactive && (
                  <text x="-58" y={yStart + 20} fill="#666" fontSize="8" textAnchor="middle">B{bed.id}</text>
                )}
                
                {/* H2 Quench injection */}
                {idx < bedImbalance.beds.length - 1 && (
                  <g>
                    <line x1="48" y1={yEnd + 2} x2="68" y2={yEnd + 2} stroke={equipment.h2Compressor ? "#0FC9C9" : "#B47A1F"} strokeWidth="2" />
                    <circle cx="58" cy={yEnd + 2} r="2.5" fill={equipment.h2Compressor ? "#0FC9C9" : "#B47A1F"} opacity="0.8">
                      {equipment.h2Compressor && (
                        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
                      )}
                    </circle>
                    {interactive && (
                      <text x="78" y={yEnd + 5} fill="#888" fontSize="7" textAnchor="start">H₂ Q{idx + 1}</text>
                    )}
                  </g>
                )}
              </g>
            );
          })}
          
          {/* Overall reactor thermal glow */}
          {escalationLevel >= 2 && (
            <rect x="-45" y="-77" width="90" height="154" fill="url(#reactorGlow)" className={escalationLevel >= 3 ? "animate-[pulse_1.2s_ease-in-out_infinite]" : "transition-opacity duration-500"} />
          )}
          
          <text x="0" y="105" fill="#aaa" fontSize="13" textAnchor="middle" fontWeight="bold">R-1</text>
          {interactive && <text x="0" y="118" fill="#888" fontSize="10" textAnchor="middle">Reactor</text>}
        </g>

        {/* R-1 Temperature Display */}
        {interactive && (
          <>
            <text x="440" y="145" fill="#888" fontSize="9" textAnchor="middle">R-1 Outlet</text>
            <text x="440" y="160" fill={baseColor} fontSize="12" textAnchor="middle" fontWeight="700" className="transition-colors duration-500">
              T = {currentTemp.toFixed(1)}{units}
            </text>
            {slope > 0 && (
              <text x="440" y="175" fill={baseColor} fontSize="10" textAnchor="middle" className="transition-colors duration-500">
                Δ = +{slope.toFixed(2)} {units}/min
              </text>
            )}
          </>
        )}

        {/* H2 SYSTEM INDICATOR */}
        <g transform="translate(420, 450)" onClick={() => handleUnitClick('h2')} className={cn(interactive && "cursor-pointer")}>
          <rect x="-35" y="-20" width="70" height="40" rx="5" fill="#2a2a2a" stroke={equipment.h2Compressor ? "#0FC9C9" : "#B47A1F"} strokeWidth="2" filter="url(#equipmentShadow)" />
          <text x="0" y="-5" fill="#aaa" fontSize="9" textAnchor="middle" fontWeight="600">H2-1</text>
          <text x="0" y="8" fill="#888" fontSize="8" textAnchor="middle">
            {equipment.h2Compressor ? "Available" : "Limited"}
          </text>
        </g>

        {/* PIPE: R-1 Outlet to TCV-02A */}
        <line x1="488" y1="280" x2="545" y2="280" stroke="#555" strokeWidth="4" />
        <circle cx="515" cy="280" r="4" fill={shellThermalColor}>
          <animate attributeName="cx" values="488;545" dur={animationSpeed} repeatCount="indefinite" />
        </circle>
        
        {/* TCV-02A: Shell Side Inlet Control */}
        <g transform="translate(565, 280)" onClick={() => handleUnitClick('tcv02a')} className={cn(interactive && "cursor-pointer")}>
          <polygon points="-10,-10 10,-10 8,0 10,10 -10,10 -8,0" fill={valveStates.tcv02a === "OPEN" ? "#2F5D80" : "#B47A1F"} stroke="#555" strokeWidth="2" />
          <text x="0" y="-20" fill="#aaa" fontSize="9" textAnchor="middle" fontWeight="600">TCV-02A</text>
        </g>

        {/* PIPE: TCV-02A to E-1 Shell Inlet */}
        <line x1="575" y1="280" x2="575" y2="320" stroke="#555" strokeWidth="3" />
        <line x1="575" y1="320" x2="300" y2="320" stroke="#555" strokeWidth="3" />
        <line x1="300" y1="320" x2="300" y2="292" stroke="#555" strokeWidth="3" />
        <circle cx="420" cy="320" r="3" fill={shellThermalColor}>
          <animate attributeName="cx" values="575;300" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* SHELL BYPASS (TCV-02B) */}
        <g opacity={valveStates.tcv02b === "CLOSED" ? 0.3 : 1}>
          <line x1="575" y1="280" x2="625" y2="280" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          <line x1="625" y1="280" x2="625" y2="360" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          <line x1="625" y1="360" x2="200" y2="360" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          <line x1="200" y1="360" x2="200" y2="292" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          
          <g transform="translate(410, 360)" onClick={() => handleUnitClick('tcv02b')} className={cn(interactive && "cursor-pointer")}>
            <polygon points="-10,-8 10,-8 8,0 10,8 -10,8 -8,0" fill={valveStates.tcv02b === "OPEN" ? "#B47A1F" : "#333"} stroke="#555" strokeWidth="2" />
            <text x="0" y="-18" fill="#aaa" fontSize="9" textAnchor="middle" fontWeight="600">TCV-02B</text>
            {interactive && <text x="0" y="26" fill="#888" fontSize="8" textAnchor="middle">Shell Bypass</text>}
          </g>
          
          {valveStates.tcv02b === "OPEN" && (
            <circle cx="480" cy="360" r="3" fill="#B47A1F">
              <animate attributeName="cx" values="625;200" dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {/* PIPE: E-1 Shell Out to E-2 */}
        <line x1="200" y1="292" x2="200" y2="280" stroke="#555" strokeWidth="3" />
        <line x1="200" y1="280" x2="680" y2="280" stroke="#555" strokeWidth="4" />
        <circle cx="420" cy="280" r="4" fill={getThermalColor(shellSideOutletTemp)}>
          <animate attributeName="cx" values="200;680" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* EFFLUENT COOLER E-2 */}
        <g transform="translate(760, 280)" onClick={() => handleUnitClick('e2')} className={cn(interactive && "cursor-pointer hover:opacity-90 transition-all duration-400", coolingCapacity === "CONSTRAINED" && "animate-[wiggle_2s_ease-in-out_infinite]")}>
          <rect x="-45" y="-50" width="90" height="100" rx="10" fill="#2a2a2a" stroke={coolerColor} strokeWidth="3" filter="url(#equipmentShadow)" className="transition-all duration-500" />
          {/* Cooling coils */}
          {[-35, -22, -9, 4, 17, 30].map(y => (
            <line key={y} x1="-35" y1={y} x2="35" y2={y} stroke="#2F5D80" strokeWidth="2" opacity="0.6" />
          ))}
          {!equipment.effluentCooler && (
            <>
              <line x1="-40" y1="-45" x2="40" y2="45" stroke="#A13A1F" strokeWidth="3" />
              <line x1="40" y1="-45" x2="-40" y2="45" stroke="#A13A1F" strokeWidth="3" />
            </>
          )}
          <text x="0" y="70" fill="#aaa" fontSize="11" textAnchor="middle" fontWeight="600">E-2</text>
          {interactive && <text x="0" y="82" fill="#888" fontSize="9" textAnchor="middle">Effluent Cooler</text>}
        </g>

        {/* COOLER BYPASS (TCV-03A) */}
        <g opacity={valveStates.tcv03a === "CLOSED" ? 0.3 : 1}>
          <line x1="680" y1="280" x2="680" y2="350" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          <line x1="680" y1="350" x2="840" y2="350" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          <line x1="840" y1="350" x2="840" y2="280" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          
          <g transform="translate(760, 350)" onClick={() => handleUnitClick('tcv03a')} className={cn(interactive && "cursor-pointer")}>
            <polygon points="-10,-8 10,-8 8,0 10,8 -10,8 -8,0" fill={valveStates.tcv03a === "OPEN" ? "#B47A1F" : "#333"} stroke="#555" strokeWidth="2" />
            <text x="0" y="-18" fill="#aaa" fontSize="9" textAnchor="middle" fontWeight="600">TCV-03A</text>
            {interactive && <text x="0" y="26" fill="#888" fontSize="8" textAnchor="middle">Cooler Bypass</text>}
          </g>
          
          {valveStates.tcv03a === "OPEN" && (
            <circle cx="740" cy="350" r="3" fill="#B47A1F">
              <animate attributeName="cx" values="680;840" dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {/* PIPE: E-2 to D-1 */}
        <line x1="805" y1="280" x2="900" y2="280" stroke="#555" strokeWidth="4" />
        <circle cx="850" cy="280" r="4" fill={cooledThermalColor}>
          <animate attributeName="cx" values="805;900" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* THREE-PHASE SEPARATOR D-1 */}
        <g transform="translate(990, 280)" onClick={() => handleUnitClick('d1')} className={cn(interactive && "cursor-pointer hover:opacity-90 transition-all duration-400")}>
          {/* Horizontal vessel */}
          <ellipse cx="-65" cy="0" rx="10" ry="40" fill="#1a1a1a" stroke="#555" strokeWidth="2.5" />
          <rect x="-65" y="-40" width="130" height="80" fill="#2a2a2a" stroke="#555" strokeWidth="2.5" filter="url(#equipmentShadow)" />
          <ellipse cx="65" cy="0" rx="10" ry="40" fill="#2a2a2a" stroke="#555" strokeWidth="2.5" />
          
          {/* Gas space (top) */}
          <rect x="-60" y="-35" width="120" height="18" fill="#333" opacity="0.3" />
          <text x="0" y="-22" fill="#888" fontSize="7" textAnchor="middle">Gas</text>
          
          {/* Demister indication */}
          <path d="M -40,-30 L -30,-24 L -20,-30 L -10,-24 L 0,-30 L 10,-24 L 20,-30 L 30,-24 L 40,-30" stroke="#555" strokeWidth="1" fill="none" />
          
          {/* Naphtha layer */}
          <rect x="-60" y="-17" width="120" height="18" fill="#B47A1F" opacity="0.2" />
          <text x="0" y="-4" fill="#D4A547" fontSize="7" textAnchor="middle">Naphtha</text>
          
          {/* Weir */}
          <line x1="25" y1="-17" x2="25" y2="8" stroke="#555" strokeWidth="2" />
          
          {/* Water layer + pot */}
          <rect x="-60" y="1" width="120" height="15" fill="#2F5D80" opacity="0.2" />
          <text x="0" y="12" fill="#2F5D80" fontSize="7" textAnchor="middle">Water</text>
          <rect x="-70" y="16" width="30" height="20" rx="3" fill="#2a2a2a" stroke="#555" strokeWidth="1.5" />
          <text x="-55" y="29" fill="#888" fontSize="6" textAnchor="middle">H₂O Pot</text>
          
          {/* Level indicators */}
          <line x1="-52" y1="-8" x2="-48" y2="-8" stroke="#D4A547" strokeWidth="2" />
          <line x1="-52" y1="8" x2="-48" y2="8" stroke="#2F5D80" strokeWidth="2" />
          
          {/* Outlets */}
          <line x1="0" y1="-40" x2="0" y2="-50" stroke="#888" strokeWidth="2" />
          <text x="0" y="-55" fill="#888" fontSize="8" textAnchor="middle">Gas Out</text>
          <line x1="60" y1="-8" x2="75" y2="-8" stroke="#D4A547" strokeWidth="2" />
          <line x1="-55" y1="36" x2="-55" y2="46" stroke="#2F5D80" strokeWidth="2" />
          
          <text x="0" y="65" fill="#aaa" fontSize="11" textAnchor="middle" fontWeight="600">D-1</text>
          {interactive && <text x="0" y="77" fill="#888" fontSize="9" textAnchor="middle">3-Phase Separator</text>}
        </g>

        {/* Gas recycle (implied compression) */}
        <g opacity="0.5">
          <line x1="990" y1="230" x2="990" y2="210" stroke="#0FC9C9" strokeWidth="2" strokeDasharray="3,3" />
          <text x="990" y="200" fill="#888" fontSize="7" textAnchor="middle">to compression</text>
          <line x1="990" y1="190" x2="990" y2="170" stroke="#0FC9C9" strokeWidth="2" strokeDasharray="3,3" />
          <line x1="990" y1="170" x2="520" y2="170" stroke="#0FC9C9" strokeWidth="2" strokeDasharray="3,3" />
          <line x1="520" y1="170" x2="520" y2="240" stroke="#0FC9C9" strokeWidth="2" strokeDasharray="3,3" />
          <text x="740" y="165" fill="#888" fontSize="7" textAnchor="middle">Pressurized H₂</text>
        </g>

        {/* Status indicators */}
        {interactive && (
          <>
            <g transform="translate(50, 30)">
              <rect x="0" y="0" width="140" height="24" rx="4" fill="#1e1e1e" stroke="#444" strokeWidth="1" />
              <text x="70" y="16" fill={sensorQuality === "good" ? "#0F9F9F" : sensorQuality === "suspect" ? "#D4A547" : "#D4653F"} fontSize="10" textAnchor="middle" fontWeight="500">
                Instrument: {sensorQuality.toUpperCase()}
              </text>
            </g>
            <g transform="translate(200, 30)">
              <rect x="0" y="0" width="110" height="24" rx="4" fill="#1e1e1e" stroke="#444" strokeWidth="1" />
              <text x="55" y="16" fill="#999" fontSize="10" textAnchor="middle" fontWeight="500">
                Mode: {opMode === "steady" ? "Steady" : "Transient"}
              </text>
            </g>
            {preheatActive && (
              <g transform="translate(320, 30)">
                <rect x="0" y="0" width="150" height="24" rx="4" fill="#1e1e1e" stroke={preheatColor} strokeWidth="1" />
                <text x="75" y="16" fill={preheatColor} fontSize="10" textAnchor="middle" fontWeight="500">
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
              <p className="text-[#ccc] text-xs mt-1">Controls feed to E-1 tube side</p>
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
          
          {selectedUnit === 'h2' && (
            <>
              <h4 className="text-[#aaa] text-sm font-bold mb-2">H2-1 Compressor Margin</h4>
              <p className="text-[#ccc] text-xs">Hydrogen: {equipment.h2Compressor ? "Available" : "Limited"}</p>
              {!equipment.h2Compressor && <p className="text-[#B47A1F] text-xs mt-2 italic">Limits quench effectiveness</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}