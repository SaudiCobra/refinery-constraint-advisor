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
        <line x1="78" y1="260" x2="155" y2="260" stroke="#555" strokeWidth="4" />
        <circle cx="110" cy="260" r="4" fill="#2F5D80">
          <animate attributeName="cx" values="78;155" dur={animationSpeed} repeatCount="indefinite" />
        </circle>
        
        {/* TCV-01B: Primary Feed Control */}
        <g transform="translate(175, 260)" onClick={() => handleUnitClick('tcv01b')} className={cn(interactive && "cursor-pointer")}>
          <polygon points="-10,-10 10,-10 8,0 10,10 -10,10 -8,0" fill="#2F5D80" stroke="#555" strokeWidth="2" />
          <text x="0" y="-20" fill="#aaa" fontSize="9" textAnchor="middle" fontWeight="600">TCV-01B</text>
        </g>
        
        {/* PIPE: TCV-01B to E-1 Tube Inlet */}
        <line x1="185" y1="260" x2="225" y2="260" stroke="#555" strokeWidth="4" />
        <circle cx="205" cy="260" r="3" fill="#2F5D80">
          <animate attributeName="cx" values="185;225" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* FEED/EFFLUENT HEAT EXCHANGER E-1 */}
        <g transform="translate(290, 260)" onClick={() => handleUnitClick('e1')} className={cn(interactive && "cursor-pointer hover:opacity-90 transition-all duration-400")}>
          {/* Shell body */}
          <ellipse cx="-50" cy="0" rx="10" ry="38" fill="#1a1a1a" stroke={preheatColor} strokeWidth="2.5" />
          <rect x="-50" y="-38" width="100" height="76" fill="#2a2a2a" stroke={preheatColor} strokeWidth="3" filter="url(#equipmentShadow)" />
          <ellipse cx="50" cy="0" rx="10" ry="38" fill="#2a2a2a" stroke={preheatColor} strokeWidth="2.5" />
          
          {/* Tube bundle */}
          {[-28, -20, -12, -4, 4, 12, 20, 28].map(yOffset => (
            <line key={yOffset} x1="-45" y1={yOffset} x2="45" y2={yOffset} stroke="#444" strokeWidth="1.2" />
          ))}
          
          {/* Thermal glows */}
          <rect x="-45" y="-30" width="90" height="60" fill={tubeThermalColor} opacity="0.12" className="transition-all duration-500" />
          <rect x="-48" y="-36" width="96" height="72" fill={shellThermalColor} opacity="0.08" className="transition-all duration-500" />
          
          {/* Nozzles */}
          <circle cx="-50" cy="0" r="5" fill="#333" stroke={tubeThermalColor} strokeWidth="1.5" />
          <circle cx="50" cy="0" r="5" fill="#333" stroke={tubeThermalColor} strokeWidth="1.5" />
          <circle cx="-50" cy="-32" r="5" fill="#333" stroke={shellThermalColor} strokeWidth="1.5" />
          <circle cx="50" cy="32" r="5" fill="#333" stroke={shellThermalColor} strokeWidth="1.5" />
          
          <text x="0" y="60" fill="#aaa" fontSize="11" textAnchor="middle" fontWeight="600">E-1</text>
          {interactive && <text x="0" y="72" fill="#888" fontSize="9" textAnchor="middle">Shell & Tube HX</text>}
        </g>

        {/* E-1 Temperature Labels (outside safe zone) */}
        {interactive && (
          <>
            <text x="230" y="235" fill="#888" fontSize="8" textAnchor="middle">E-1 Tube Out</text>
            <text x="230" y="247" fill={tubeThermalColor} fontSize="9" textAnchor="middle" fontWeight="500" className="transition-colors duration-400">
              T = {tubeSideOutletTemp.toFixed(1)}{units}
            </text>
            <text x="290" y="320" fill="#888" fontSize="8" textAnchor="middle">E-1 Shell In</text>
            <text x="290" y="332" fill={shellThermalColor} fontSize="9" textAnchor="middle" className="transition-colors duration-400">
              T = {reactorOutletTemp.toFixed(0)}{units}
            </text>
            <text x="340" y="210" fill="#888" fontSize="8" textAnchor="middle">E-1 Shell Out</text>
            <text x="340" y="222" fill={getThermalColor(shellSideOutletTemp)} fontSize="9" textAnchor="middle" className="transition-colors duration-400">
              T = {shellSideOutletTemp.toFixed(0)}{units}
            </text>
          </>
        )}

        {/* TUBE BYPASS (TCV-01A) - positioned ABOVE E-1 */}
        <g opacity={valveStates.tcv01a === "OOS" ? 0.3 : 1}>
          <line x1="155" y1="260" x2="155" y2="210" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          <line x1="155" y1="210" x2="340" y2="210" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          <line x1="340" y1="210" x2="340" y2="260" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          
          <g transform="translate(245, 210)" onClick={() => handleUnitClick('tcv01a')} className={cn(interactive && "cursor-pointer")}>
            <polygon points="-10,-8 10,-8 8,0 10,8 -10,8 -8,0" fill={valveStates.tcv01a === "OPEN" ? "#2F5D80" : "#333"} stroke={valveStates.tcv01a === "OOS" ? "#A13A1F" : "#555"} strokeWidth="2" />
            <text x="0" y="-18" fill="#aaa" fontSize="9" textAnchor="middle" fontWeight="600">TCV-01A</text>
            {interactive && <text x="0" y="26" fill="#888" fontSize="8" textAnchor="middle">Tube Bypass</text>}
          </g>
          
          {valveStates.tcv01a === "OPEN" && (
            <circle cx="200" cy="210" r="3" fill="#2F5D80">
              <animate attributeName="cx" values="155;340" dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {/* PIPE: E-1 Tube Out to Reactor */}
        <line x1="340" y1="260" x2="395" y2="260" stroke="#555" strokeWidth="4" />
        <circle cx="365" cy="260" r="4" fill={tubeThermalColor}>
          <animate attributeName="cx" values="340;395" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* REACTOR R-1 with Horizontal Bed Zones */}
        <g transform="translate(470, 280)" onClick={() => handleUnitClick('r1')} className={cn(interactive && "cursor-pointer hover:opacity-90 transition-all duration-400")}>
          {/* Vessel shell */}
          <ellipse cx="0" cy="-80" rx="48" ry="10" fill="#1a1a1a" stroke={baseColor} strokeWidth="2.5" />
          <rect x="-48" y="-80" width="96" height="160" fill="#2a2a2a" stroke={baseColor} strokeWidth="4" filter="url(#equipmentShadow)" />
          <ellipse cx="0" cy="80" rx="48" ry="10" fill="#2a2a2a" stroke={baseColor} strokeWidth="2.5" />
          
          {/* Three horizontal catalyst bed zones */}
          {bedImbalance && bedImbalance.beds.map((bed, idx) => {
            const yStart = -60 + (idx * 50);
            const bedHeight = 42;
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
            
            // Bed background zone
            const bedOpacity = 0.15 + glowIntensity;
            
            return (
              <g key={bed.id}>
                {/* Bed zone shading */}
                <rect 
                  x="-42" 
                  y={yStart} 
                  width="84" 
                  height={bedHeight} 
                  fill={bedColor} 
                  opacity={bedOpacity}
                  className="transition-all duration-500"
                />
                
                {/* Catalyst particles inside bed */}
                {Array.from({ length: 60 }).map((_, pidx) => {
                  const row = Math.floor(pidx / 12);
                  const col = pidx % 12;
                  const px = -38 + col * 7;
                  const py = yStart + 5 + row * 7;
                  return (
                    <circle
                      key={pidx}
                      cx={px}
                      cy={py}
                      r="1.5"
                      fill={bedColor}
                      opacity={0.6 + glowIntensity}
                      className="transition-all duration-500"
                    />
                  );
                })}
                
                {/* Bed label outside vessel */}
                {interactive && (
                  <text x="-58" y={yStart + bedHeight / 2 + 3} fill="#666" fontSize="8" textAnchor="middle">B{bed.id}</text>
                )}
                
                {/* H2 Quench injection between beds */}
                {idx < bedImbalance.beds.length - 1 && (
                  <g>
                    <line x1="48" y1={yStart + bedHeight + 2} x2="68" y2={yStart + bedHeight + 2} stroke={equipment.h2Compressor ? "#0FC9C9" : "#B47A1F"} strokeWidth="2" />
                    <circle cx="58" cy={yStart + bedHeight + 2} r="2.5" fill={equipment.h2Compressor ? "#0FC9C9" : "#B47A1F"} opacity="0.8">
                      {equipment.h2Compressor && (
                        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
                      )}
                    </circle>
                    {interactive && (
                      <text x="78" y={yStart + bedHeight + 5} fill="#888" fontSize="7" textAnchor="start">H₂ Q{idx + 1}</text>
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

        {/* R-1 Temperature Display (above reactor, safe zone) */}
        {interactive && (
          <>
            <text x="470" y="175" fill="#888" fontSize="9" textAnchor="middle">R-1 Outlet</text>
            <text x="470" y="190" fill={baseColor} fontSize="12" textAnchor="middle" fontWeight="700" className="transition-colors duration-400">
              T = {currentTemp.toFixed(1)}{units}
            </text>
            {slope > 0 && (
              <text x="470" y="205" fill={baseColor} fontSize="10" textAnchor="middle" className="transition-colors duration-400">
                Δ = +{slope.toFixed(2)} {units}/min
              </text>
            )}
          </>
        )}

        {/* PIPE: R-1 Outlet to Branch Point */}
        <line x1="518" y1="280" x2="560" y2="280" stroke="#555" strokeWidth="4" />
        <circle cx="540" cy="280" r="4" fill={shellThermalColor}>
          <animate attributeName="cx" values="518;560" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* UPPER BRANCH: TCV-02A to E-1 Shell Inlet */}
        <g>
          {/* Vertical rise to TCV-02A */}
          <line x1="560" y1="280" x2="560" y2="250" stroke="#555" strokeWidth="3" />
          {valveStates.tcv02a !== "CLOSED" && (
            <circle cx="560" cy="265" r="3" fill={shellThermalColor}>
              <animate attributeName="cy" values="280;250" dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
          
          {/* TCV-02A */}
          <g transform="translate(560, 230)" onClick={() => handleUnitClick('tcv02a')} className={cn(interactive && "cursor-pointer")}>
            <polygon points="-10,-10 10,-10 8,0 10,10 -10,10 -8,0" fill={valveStates.tcv02a === "OPEN" ? "#2F5D80" : "#B47A1F"} stroke="#555" strokeWidth="2" />
            <text x="0" y="-22" fill="#aaa" fontSize="9" textAnchor="middle" fontWeight="600">TCV-02A</text>
          </g>
          
          {/* Horizontal to shell inlet */}
          <line x1="560" y1="220" x2="560" y2="310" stroke="#555" strokeWidth="3" />
          <line x1="560" y1="310" x2="340" y2="310" stroke="#555" strokeWidth="3" />
          <line x1="340" y1="310" x2="340" y2="292" stroke="#555" strokeWidth="3" />
          {valveStates.tcv02a !== "CLOSED" && (
            <circle cx="440" cy="310" r="3" fill={shellThermalColor}>
              <animate attributeName="cx" values="560;340" dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {/* LOWER BRANCH: TCV-02B Shell Bypass (BELOW reactor) */}
        <g opacity={valveStates.tcv02b === "CLOSED" ? 0.3 : 1}>
          {/* Drop from branch point */}
          <line x1="560" y1="280" x2="560" y2="370" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          
          {/* TCV-02B positioned BELOW and to the right of reactor */}
          <g transform="translate(560, 390)" onClick={() => handleUnitClick('tcv02b')} className={cn(interactive && "cursor-pointer")}>
            <polygon points="-10,-8 10,-8 8,0 10,8 -10,8 -8,0" fill={valveStates.tcv02b === "OPEN" ? "#B47A1F" : "#333"} stroke="#555" strokeWidth="2" />
            <text x="0" y="26" fill="#aaa" fontSize="9" textAnchor="middle" fontWeight="600">TCV-02B</text>
            {interactive && <text x="0" y="38" fill="#888" fontSize="8" textAnchor="middle">Shell Bypass</text>}
          </g>
          
          {/* Horizontal bypass route */}
          <line x1="560" y1="398" x2="240" y2="398" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          <line x1="240" y1="398" x2="240" y2="292" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          
          {valveStates.tcv02b !== "CLOSED" && (
            <circle cx="400" cy="398" r="3" fill="#B47A1F">
              <animate attributeName="cx" values="560;240" dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {/* PIPE: E-1 Shell Out to E-2 (direct, shorter) */}
        <line x1="240" y1="292" x2="240" y2="260" stroke="#555" strokeWidth="3" />
        <line x1="240" y1="260" x2="680" y2="260" stroke="#555" strokeWidth="4" />
        <circle cx="440" cy="260" r="4" fill={getThermalColor(shellSideOutletTemp)}>
          <animate attributeName="cx" values="240;680" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* EFFLUENT COOLER E-2 */}
        <g transform="translate(740, 260)" onClick={() => handleUnitClick('e2')} className={cn(interactive && "cursor-pointer hover:opacity-90 transition-all duration-400", coolingCapacity === "CONSTRAINED" && "animate-[wiggle_2s_ease-in-out_infinite]")}>
          <rect x="-45" y="-50" width="90" height="100" rx="10" fill="#2a2a2a" stroke={coolerColor} strokeWidth="3" filter="url(#equipmentShadow)" className="transition-all duration-400" />
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
          <line x1="680" y1="260" x2="680" y2="350" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          <line x1="680" y1="350" x2="800" y2="350" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          <line x1="800" y1="350" x2="800" y2="260" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          
          <g transform="translate(740, 350)" onClick={() => handleUnitClick('tcv03a')} className={cn(interactive && "cursor-pointer")}>
            <polygon points="-10,-8 10,-8 8,0 10,8 -10,8 -8,0" fill={valveStates.tcv03a === "OPEN" ? "#B47A1F" : "#333"} stroke="#555" strokeWidth="2" />
            <text x="0" y="28" fill="#aaa" fontSize="9" textAnchor="middle" fontWeight="600">TCV-03A</text>
            {interactive && <text x="0" y="40" fill="#888" fontSize="8" textAnchor="middle">Cooler Bypass</text>}
          </g>
          
          {valveStates.tcv03a === "OPEN" && (
            <circle cx="720" cy="350" r="3" fill="#B47A1F">
              <animate attributeName="cx" values="680;800" dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {/* PIPE: E-2 to D-1 */}
        <line x1="785" y1="260" x2="880" y2="260" stroke="#555" strokeWidth="4" />
        <circle cx="830" cy="260" r="4" fill={cooledThermalColor}>
          <animate attributeName="cx" values="785;880" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* THREE-PHASE SEPARATOR D-1 */}
        <g transform="translate(970, 260)" onClick={() => handleUnitClick('d1')} className={cn(interactive && "cursor-pointer hover:opacity-90 transition-all duration-400")}>
          {/* Horizontal vessel */}
          <ellipse cx="-65" cy="0" rx="10" ry="40" fill="#1a1a1a" stroke="#555" strokeWidth="2.5" />
          <rect x="-65" y="-40" width="130" height="80" fill="#2a2a2a" stroke="#555" strokeWidth="2.5" filter="url(#equipmentShadow)" />
          <ellipse cx="65" cy="0" rx="10" ry="40" fill="#2a2a2a" stroke="#555" strokeWidth="2.5" />
          
          {/* Gas space */}
          <rect x="-60" y="-35" width="120" height="18" fill="#333" opacity="0.3" />
          <text x="0" y="-23" fill="#888" fontSize="7" textAnchor="middle">Gas</text>
          <path d="M -40,-30 L -30,-24 L -20,-30 L -10,-24 L 0,-30 L 10,-24 L 20,-30 L 30,-24 L 40,-30" stroke="#555" strokeWidth="1" fill="none" />
          
          {/* Naphtha layer */}
          <rect x="-60" y="-17" width="120" height="18" fill="#B47A1F" opacity="0.2" />
          <text x="0" y="-5" fill="#D4A547" fontSize="7" textAnchor="middle">Naphtha</text>
          <line x1="25" y1="-17" x2="25" y2="8" stroke="#555" strokeWidth="2" />
          
          {/* Water layer */}
          <rect x="-60" y="1" width="120" height="15" fill="#2F5D80" opacity="0.2" />
          <text x="0" y="11" fill="#2F5D80" fontSize="7" textAnchor="middle">Water</text>
          
          {/* Level indicators */}
          <line x1="-52" y1="-8" x2="-48" y2="-8" stroke="#D4A547" strokeWidth="2" />
          <line x1="-52" y1="8" x2="-48" y2="8" stroke="#2F5D80" strokeWidth="2" />
          
          {/* Gas outlet */}
          <line x1="0" y1="-40" x2="0" y2="-55" stroke="#888" strokeWidth="2" />
          <text x="0" y="-60" fill="#888" fontSize="8" textAnchor="middle">Gas Out</text>
          
          {/* Naphtha outlet */}
          <line x1="60" y1="-8" x2="75" y2="-8" stroke="#D4A547" strokeWidth="2" />
          
          <text x="0" y="65" fill="#aaa" fontSize="11" textAnchor="middle" fontWeight="600">D-1</text>
          {interactive && <text x="0" y="77" fill="#888" fontSize="9" textAnchor="middle">3-Phase Separator</text>}
        </g>

        {/* H2O Pot (below separator, outside body) */}
        <g transform="translate(905, 296)">
          <rect x="-20" y="0" width="30" height="22" rx="3" fill="#2a2a2a" stroke="#555" strokeWidth="1.5" />
          <line x1="-5" y1="-4" x2="-5" y2="0" stroke="#2F5D80" strokeWidth="2" />
          {interactive && <text x="-5" y="35" fill="#888" fontSize="7" textAnchor="middle">H₂O Pot</text>}
        </g>

        {/* Gas Recycle System (from D-1 to H2 quenches) */}
        <g opacity="0.5">
          {/* Gas leaving separator */}
          <line x1="970" y1="205" x2="970" y2="175" stroke="#0FC9C9" strokeWidth="2" strokeDasharray="3,3" />
          <text x="970" y="165" fill="#888" fontSize="7" textAnchor="middle">To H₂ Compressor</text>
          
          {/* Compressed H2 coming from above */}
          <line x1="520" y1="150" x2="520" y2="180" stroke="#0FC9C9" strokeWidth="2" strokeDasharray="3,3" />
          <text x="520" y="140" fill="#888" fontSize="7" textAnchor="middle">From H₂ System</text>
          <line x1="520" y1="180" x2="520" y2="228" stroke="#0FC9C9" strokeWidth="2" strokeDasharray="3,3" />
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