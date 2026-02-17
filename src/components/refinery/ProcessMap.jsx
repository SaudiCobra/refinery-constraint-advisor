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
  // Flow speed scaling based on escalation
  const flowSpeedMultiplier = escalationLevel === 0 ? 1.0 : escalationLevel === 1 ? 1.2 : escalationLevel === 2 ? 1.5 : 1.8;
  const animationSpeed = `${8 / flowSpeedMultiplier}s`;
  
  // Valve states (simulated based on equipment and escalation)
  const valveStates = {
    tcv01a: equipment.bypassValve ? "CLOSED" : "OOS", // Feed bypass
    tcv01b: "OPEN", // Primary feed to tube side
    tcv02a: escalationLevel >= 2 && !equipment.preheatExchanger ? "MODULATING" : "OPEN", // Effluent to shell
    tcv02b: equipment.bypassValve && escalationLevel >= 2 ? "MODULATING" : "CLOSED", // Shell bypass
  };

  const preheatColor = preheatActive && preheatStatus?.includes("Stress") ? "#A13A1F" 
    : preheatActive && preheatStatus?.includes("Warning") ? "#B47A1F" 
    : "#0F5F5F";

  const handleUnitClick = (unit) => {
    if (!interactive) return;
    setSelectedUnit(selectedUnit === unit ? null : unit);
  };

  // Thermal calculations
  const feedEffluentTemp = Math.max(currentTemp - 50, 280);
  const reactorOutletTemp = currentTemp + 15;
  
  // Tube side temperature (feed outlet from E-1)
  const tubeSideOutletTemp = valveStates.tcv01a === "OPEN" ? currentTemp * 0.85 : currentTemp;
  
  // Shell side temperature (effluent after heat recovery)
  const shellSideOutletTemp = valveStates.tcv02b === "OPEN" ? reactorOutletTemp * 0.95 : feedEffluentTemp;
  
  // Thermal colors for tube and shell
  const getThermalColor = (temp) => {
    if (temp < 300) return "#0F5F5F"; // Neutral teal
    if (temp < 340) return "#2F5D80"; // Warm teal
    if (temp < 360) return "#B47A1F"; // Amber
    if (temp < 375) return "#D4653F"; // Burnt orange
    return "#A13A1F"; // Deep crimson
  };
  
  const tubeThermalColor = getThermalColor(tubeSideOutletTemp);
  const shellThermalColor = getThermalColor(reactorOutletTemp);

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 relative">
      <svg viewBox="0 0 1400 500" className="w-full h-auto">
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

        {/* FEED SOURCE F-1 */}
        <g transform="translate(60, 240)">
          <circle cx="0" cy="0" r="22" fill="#2a2a2a" stroke="#555" strokeWidth="2" filter="url(#equipmentShadow)" />
          <path d="M -8,-5 L 8,-5 L 8,5 L -8,5 Z" fill="#444" stroke="#666" strokeWidth="1" />
          <text x="0" y="38" fill="#aaa" fontSize="11" textAnchor="middle" fontWeight="600">F-1</text>
          {interactive && (
            <>
              <text x="0" y="50" fill="#888" fontSize="9" textAnchor="middle">Feed</text>
              <text x="0" y="-30" fill="#999" fontSize="10" textAnchor="middle">{feedFlow.toLocaleString()} kg/h</text>
            </>
          )}
        </g>

        {/* PIPE: Feed to TCV-01B */}
        <line x1="82" y1="240" x2="140" y2="240" stroke="#555" strokeWidth="4" />
        <circle cx="110" cy="240" r="4" fill={baseColor}>
          <animate attributeName="cx" values="82;140" dur={animationSpeed} repeatCount="indefinite" />
        </circle>
        
        {/* TCV-01B: Primary Feed Control Valve */}
        <g transform="translate(160, 240)" onClick={() => handleUnitClick('tcv01b')} className={cn(interactive && "cursor-pointer")}>
          <polygon 
            points="-10,-10 10,-10 8,0 10,10 -10,10 -8,0" 
            fill={valveStates.tcv01b === "OPEN" ? "#2F5D80" : valveStates.tcv01b === "MODULATING" ? "#B47A1F" : "#7A0F0F"} 
            stroke="#555" 
            strokeWidth="2"
          />
          <text x="0" y="-18" fill="#aaa" fontSize="9" textAnchor="middle" fontWeight="600">TCV-01B</text>
          {valveStates.tcv01b === "MODULATING" && (
            <circle cx="0" cy="0" r="3" fill="#D4A547" opacity="0.8">
              <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite" />
            </circle>
          )}
        </g>
        
        {/* PIPE: TCV-01B to E-1 Tube Side */}
        <line x1="170" y1="240" x2="195" y2="240" stroke="#555" strokeWidth="4" />
        <circle cx="180" cy="240" r="4" fill={tubeThermalColor}>
          <animate attributeName="cx" values="170;195" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* FEED/EFFLUENT HEAT EXCHANGER E-1 - Realistic Shell & Tube */}
        <g 
          transform="translate(260, 240)" 
          onClick={() => handleUnitClick('e1')}
          className={cn(interactive && "cursor-pointer hover:opacity-80 transition-opacity")}
        >
          {/* Horizontal shell body */}
          <ellipse cx="-50" cy="0" rx="8" ry="35" fill="#1a1a1a" stroke={preheatColor} strokeWidth="2" />
          <rect x="-50" y="-35" width="100" height="70" fill="#2a2a2a" stroke={preheatColor} strokeWidth="3" filter="url(#equipmentShadow)" />
          <ellipse cx="50" cy="0" rx="8" ry="35" fill="#2a2a2a" stroke={preheatColor} strokeWidth="2" />
          
          {/* Tube bundle (horizontal parallel tubes) */}
          {[-22, -14, -6, 2, 10, 18, 26].map(yOffset => (
            <line key={yOffset} x1="-42" y1={yOffset} x2="42" y2={yOffset} stroke="#444" strokeWidth="1.5" />
          ))}
          
          {/* Tube side thermal glow */}
          <rect 
            x="-42" y="-25" width="84" height="50" 
            fill={tubeThermalColor} 
            opacity="0.15"
            className="transition-all duration-500"
          />
          
          {/* Shell side thermal glow (around tubes) */}
          <rect 
            x="-48" y="-33" width="96" height="66" 
            fill={shellThermalColor} 
            opacity="0.08"
            className="transition-all duration-500"
          />
          
          {/* Shell side inlet/outlet nozzles */}
          <circle cx="-50" cy="-28" r="4" fill="#333" stroke={shellThermalColor} strokeWidth="1.5" />
          <circle cx="50" cy="28" r="4" fill="#333" stroke={shellThermalColor} strokeWidth="1.5" />
          
          {/* Tube side inlet/outlet nozzles */}
          <circle cx="-50" cy="0" r="4" fill="#333" stroke={tubeThermalColor} strokeWidth="1.5" />
          <circle cx="50" cy="0" r="4" fill="#333" stroke={tubeThermalColor} strokeWidth="1.5" />
          
          {preheatActive && preheatStatus?.includes("stress") && (
            <rect x="-53" y="-35" width="4" height="70" fill="#A13A1F" rx="2" opacity="0.6" />
          )}
          
          <text x="0" y="55" fill="#aaa" fontSize="11" textAnchor="middle" fontWeight="600">E-1</text>
          {interactive && <text x="0" y="67" fill="#888" fontSize="9" textAnchor="middle">Shell & Tube HX</text>}
        </g>

        {/* PIPE: E-1 Tube Side Outlet */}
        <line x1="310" y1="240" x2="360" y2="240" stroke="#555" strokeWidth="4" />
        <circle cx="330" cy="240" r="4" fill={tubeThermalColor}>
          <animate attributeName="cx" values="310;360" dur={animationSpeed} repeatCount="indefinite" />
        </circle>
        
        {/* Feed outlet temp (after E-1) */}
        {interactive && (
          <text x="260" y="195" fill={tubeThermalColor} fontSize="10" textAnchor="middle" fontWeight="500" className="transition-colors duration-500">
            Tube Out: {tubeSideOutletTemp.toFixed(1)}{units}
          </text>
        )}

        {/* BYPASS PATH AROUND E-1 TUBE SIDE (TCV-01A) */}
        <g opacity={valveStates.tcv01a === "OOS" ? 0.3 : 1}>
          <line x1="140" y1="240" x2="140" y2="180" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          <line x1="140" y1="180" x2="340" y2="180" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          <line x1="340" y1="180" x2="340" y2="240" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          
          <g transform="translate(240, 180)" onClick={() => handleUnitClick('tcv01a')} className={cn(interactive && "cursor-pointer")}>
            <polygon 
              points="-10,-8 10,-8 8,0 10,8 -10,8 -8,0" 
              fill={valveStates.tcv01a === "OPEN" ? "#2F5D80" : valveStates.tcv01a === "OOS" ? "#7A0F0F" : "#333"} 
              stroke={valveStates.tcv01a === "OOS" ? "#A13A1F" : "#555"} 
              strokeWidth="2" 
            />
            <text x="0" y="-16" fill="#aaa" fontSize="9" textAnchor="middle" fontWeight="600">TCV-01A</text>
            <text x="0" y="24" fill="#888" fontSize="8" textAnchor="middle">Bypass</text>
            {valveStates.tcv01a === "OOS" && (
              <text x="0" y="35" fill="#A13A1F" fontSize="7" textAnchor="middle" fontWeight="600">OOS</text>
            )}
          </g>
          
          {valveStates.tcv01a === "OPEN" && (
            <circle cx="180" cy="180" r="3" fill="#2F5D80">
              <animate attributeName="cx" values="140;340" dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {/* PIPE: Merge point to Reactor */}
        <line x1="360" y1="240" x2="395" y2="240" stroke="#555" strokeWidth="4" />
        <circle cx="375" cy="240" r="4" fill={baseColor}>
          <animate attributeName="cx" values="360;395" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* REACTOR R-1 with Enhanced Bed Visualization */}
        <g 
          transform="translate(470, 240)" 
          onClick={() => handleUnitClick('r1')}
          className={cn(interactive && "cursor-pointer hover:opacity-80 transition-opacity")}
        >
          {/* Vessel shell */}
          <ellipse cx="0" cy="-70" rx="45" ry="9" fill="#1a1a1a" stroke={baseColor} strokeWidth="2.5" />
          <rect x="-45" y="-70" width="90" height="140" fill="#2a2a2a" stroke={baseColor} strokeWidth="4" filter="url(#equipmentShadow)" />
          <ellipse cx="0" cy="70" rx="45" ry="9" fill="#2a2a2a" stroke={baseColor} strokeWidth="2.5" />
          
          {/* Internal bed structure with quench injection points */}
          {bedImbalance && bedImbalance.beds.map((bed, idx) => {
            const yPos = -45 + (idx * 45);
            const isDominant = bed.id === bedImbalance.dominantBed;
            
            // Bed thermal color based on escalation and imbalance
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
            
            return (
              <g key={bed.id}>
                {/* Catalyst bed circles (3 rows per bed) */}
                <circle cx="-28" cy={yPos} r="5" fill={bedColor} opacity={0.7 + glowIntensity} stroke={bedColor} strokeWidth={isDominant ? 2 : 1} className="transition-all duration-500" />
                <circle cx="-10" cy={yPos} r="5" fill={bedColor} opacity={0.7 + glowIntensity} stroke={bedColor} strokeWidth={isDominant ? 2 : 1} className="transition-all duration-500" />
                <circle cx="10" cy={yPos} r="5" fill={bedColor} opacity={0.7 + glowIntensity} stroke={bedColor} strokeWidth={isDominant ? 2 : 1} className="transition-all duration-500" />
                <circle cx="28" cy={yPos} r="5" fill={bedColor} opacity={0.7 + glowIntensity} stroke={bedColor} strokeWidth={isDominant ? 2 : 1} className="transition-all duration-500" />
                
                {/* Bed label */}
                {interactive && (
                  <text x="-55" y={yPos + 3} fill="#666" fontSize="8" textAnchor="middle">B{bed.id}</text>
                )}
                
                {/* Quench injection point between beds */}
                {idx < bedImbalance.beds.length - 1 && (
                  <g>
                    <line x1="45" y1={yPos + 20} x2="55" y2={yPos + 20} stroke={equipment.h2Compressor ? "#2F5D80" : "#B47A1F"} strokeWidth="2" />
                    <circle cx="55" cy={yPos + 20} r="3" fill={equipment.h2Compressor ? "#2F5D80" : "#B47A1F"} opacity="0.8">
                      {equipment.h2Compressor && (
                        <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
                      )}
                    </circle>
                    {interactive && (
                      <text x="70" y={yPos + 22} fill="#888" fontSize="7" textAnchor="start">Q{idx + 1}</text>
                    )}
                  </g>
                )}
              </g>
            );
          })}
          
          {/* Overall reactor thermal glow */}
          {escalationLevel >= 2 && (
            <rect x="-42" y="-67" width="84" height="134" fill="url(#reactorGlow)" className={escalationLevel >= 3 ? "animate-[pulse_1.2s_ease-in-out_infinite]" : "transition-opacity duration-500"} />
          )}
          
          {/* Dominant bed outline for severe imbalance */}
          {bedImbalance && bedImbalance.severity === "SEVERE" && (
            <rect 
              x="-43" 
              y="-68" 
              width="86" 
              height="136" 
              fill="none" 
              stroke="#A13A1F" 
              strokeWidth="2" 
              strokeDasharray="6,4"
              opacity="0.6"
              className="transition-all duration-500"
            />
          )}
          
          <text x="0" y="95" fill="#aaa" fontSize="13" textAnchor="middle" fontWeight="bold">R-1</text>
          {interactive && <text x="0" y="108" fill="#888" fontSize="10" textAnchor="middle">Reactor</text>}
        </g>

        {/* Reactor temperature and slope display */}
        {interactive && (
          <>
            <text x="470" y="130" fill={baseColor} fontSize="12" textAnchor="middle" fontWeight="700" className="transition-colors duration-500">
              T={currentTemp.toFixed(1)}{units}
            </text>
            {slope > 0 && (
              <text x="470" y="145" fill={baseColor} fontSize="10" textAnchor="middle" className="transition-colors duration-500">
                +{slope.toFixed(2)} {units}/min
              </text>
            )}
          </>
        )}

        {/* HYDROGEN SYSTEM INDICATOR H2-1 */}
        <g transform="translate(450, 370)" onClick={() => handleUnitClick('h2')} className={cn(interactive && "cursor-pointer")}>
          <rect x="-35" y="-20" width="70" height="40" rx="5" fill="#2a2a2a" 
            stroke={equipment.h2Compressor ? "#2F5D80" : "#B47A1F"} 
            strokeWidth="2" filter="url(#equipmentShadow)" />
          <text x="0" y="-5" fill="#aaa" fontSize="9" textAnchor="middle" fontWeight="600">H2-1</text>
          <text x="0" y="8" fill="#888" fontSize="8" textAnchor="middle">H₂ Margin</text>
          {!equipment.h2Compressor && (
            <text x="0" y="35" fill="#B47A1F" fontSize="8" textAnchor="middle" fontWeight="600">LIMITED</text>
          )}
        </g>

        {/* PIPE: Reactor Outlet to TCV-02A */}
        <line x1="515" y1="240" x2="570" y2="240" stroke="#555" strokeWidth="4" />
        <circle cx="540" cy="240" r="4" fill={shellThermalColor}>
          <animate attributeName="cx" values="515;570" dur={animationSpeed} repeatCount="indefinite" />
        </circle>
        
        {/* TCV-02A: Primary Effluent Control Valve to Shell Side */}
        <g transform="translate(590, 240)" onClick={() => handleUnitClick('tcv02a')} className={cn(interactive && "cursor-pointer")}>
          <polygon 
            points="-10,-10 10,-10 8,0 10,10 -10,10 -8,0" 
            fill={valveStates.tcv02a === "OPEN" ? "#2F5D80" : valveStates.tcv02a === "MODULATING" ? "#B47A1F" : "#7A0F0F"} 
            stroke="#555" 
            strokeWidth="2"
          />
          <text x="0" y="-18" fill="#aaa" fontSize="9" textAnchor="middle" fontWeight="600">TCV-02A</text>
          {valveStates.tcv02a === "MODULATING" && (
            <>
              <circle cx="0" cy="0" r="3" fill="#D4A547" opacity="0.8">
                <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <text x="0" y="25" fill="#B47A1F" fontSize="7" textAnchor="middle">RESTRICT</text>
            </>
          )}
        </g>

        {/* PIPE: TCV-02A to E-1 Shell Side Inlet */}
        <line x1="600" y1="240" x2="600" y2="285" stroke="#555" strokeWidth="3" />
        <line x1="600" y1="285" x2="310" y2="285" stroke="#555" strokeWidth="3" />
        <line x1="310" y1="285" x2="310" y2="268" stroke="#555" strokeWidth="3" />
        <circle cx="450" cy="285" r="3" fill={shellThermalColor} opacity="0.7">
          <animate attributeName="cx" values="600;310" dur={animationSpeed} repeatCount="indefinite" />
        </circle>
        {interactive && (
          <text x="450" y="300" fill={shellThermalColor} fontSize="9" textAnchor="middle" className="transition-colors duration-500">
            Hot effluent to shell
          </text>
        )}
        
        {/* SHELL BYPASS (TCV-02B) */}
        <g opacity={valveStates.tcv02b === "CLOSED" ? 0.3 : 1}>
          <line x1="600" y1="240" x2="650" y2="240" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          <line x1="650" y1="240" x2="650" y2="330" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          <line x1="650" y1="330" x2="210" y2="330" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          <line x1="210" y1="330" x2="210" y2="268" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          
          <g transform="translate(430, 330)" onClick={() => handleUnitClick('tcv02b')} className={cn(interactive && "cursor-pointer")}>
            <polygon 
              points="-10,-8 10,-8 8,0 10,8 -10,8 -8,0" 
              fill={valveStates.tcv02b === "OPEN" || valveStates.tcv02b === "MODULATING" ? "#B47A1F" : "#333"} 
              stroke="#555" 
              strokeWidth="2"
            />
            <text x="0" y="-16" fill="#aaa" fontSize="9" textAnchor="middle" fontWeight="600">TCV-02B</text>
            <text x="0" y="24" fill="#888" fontSize="8" textAnchor="middle">Shell Bypass</text>
          </g>
          
          {(valveStates.tcv02b === "OPEN" || valveStates.tcv02b === "MODULATING") && (
            <circle cx="500" cy="330" r="3" fill="#B47A1F">
              <animate attributeName="cx" values="650;210" dur={animationSpeed} repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {/* PIPE: E-1 Shell Side Outlet to E-2 */}
        <line x1="210" y1="268" x2="210" y2="240" stroke="#555" strokeWidth="3" />
        <line x1="210" y1="240" x2="700" y2="240" stroke="#555" strokeWidth="4" />
        <circle cx="450" cy="240" r="4" fill={getThermalColor(shellSideOutletTemp)}>
          <animate attributeName="cx" values="210;700" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* Shell outlet temp */}
        {interactive && (
          <text x="210" y="220" fill={getThermalColor(shellSideOutletTemp)} fontSize="9" textAnchor="middle" className="transition-colors duration-500">
            Shell Out: {shellSideOutletTemp.toFixed(0)}{units}
          </text>
        )}

        {/* EFFLUENT COOLER E-2 */}
        <g 
          transform="translate(770, 240)" 
          onClick={() => handleUnitClick('e2')}
          className={cn(
            interactive && "cursor-pointer hover:opacity-80 transition-opacity",
            coolingCapacity === "CONSTRAINED" && "animate-[wiggle_2s_ease-in-out_infinite]"
          )}
        >
          <rect x="-40" y="-45" width="80" height="90" rx="10" fill="#2a2a2a" stroke={coolerColor} strokeWidth="3" filter="url(#equipmentShadow)" className="transition-all duration-500" />
          
          {/* Cooling coils */}
          <line x1="-30" y1="-30" x2="30" y2="-30" stroke="#2F5D80" strokeWidth="2" opacity="0.6" />
          <line x1="-30" y1="-18" x2="30" y2="-18" stroke="#2F5D80" strokeWidth="2" opacity="0.6" />
          <line x1="-30" y1="-6" x2="30" y2="-6" stroke="#2F5D80" strokeWidth="2" opacity="0.6" />
          <line x1="-30" y1="6" x2="30" y2="6" stroke="#2F5D80" strokeWidth="2" opacity="0.6" />
          <line x1="-30" y1="18" x2="30" y2="18" stroke="#2F5D80" strokeWidth="2" opacity="0.6" />
          <line x1="-30" y1="30" x2="30" y2="30" stroke="#2F5D80" strokeWidth="2" opacity="0.6" />
          
          {!equipment.effluentCooler && (
            <>
              <line x1="-35" y1="-40" x2="35" y2="40" stroke="#A13A1F" strokeWidth="3" />
              <line x1="35" y1="-40" x2="-35" y2="40" stroke="#A13A1F" strokeWidth="3" />
            </>
          )}
          
          <text x="0" y="65" fill="#aaa" fontSize="11" textAnchor="middle" fontWeight="600">E-2</text>
          {interactive && <text x="0" y="77" fill="#888" fontSize="9" textAnchor="middle">Effluent Cooler</text>}
        </g>

        {/* Cooling capacity display */}
        {interactive && (
          <text x="770" y="340" fill={coolerColor} fontSize="10" textAnchor="middle" fontWeight="600" className="transition-colors duration-500">
            {coolingCapacity}
          </text>
        )}

        {/* PIPE: E-2 to Separator */}
        <line x1="810" y1="240" x2="930" y2="240" stroke="#555" strokeWidth="4" />
        <circle cx="860" cy="240" r="4" fill={baseColor}>
          <animate attributeName="cx" values="810;930" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* SEPARATOR D-1 */}
        <g transform="translate(990, 240)">
          <ellipse cx="0" cy="-35" rx="30" ry="8" fill="#1a1a1a" stroke="#555" strokeWidth="2" />
          <rect x="-30" y="-35" width="60" height="70" fill="#2a2a2a" stroke="#555" strokeWidth="2" filter="url(#equipmentShadow)" />
          <ellipse cx="0" cy="35" rx="30" ry="8" fill="#2a2a2a" stroke="#555" strokeWidth="2" />
          
          <text x="0" y="60" fill="#aaa" fontSize="11" textAnchor="middle" fontWeight="600">D-1</text>
          {interactive && <text x="0" y="72" fill="#888" fontSize="9" textAnchor="middle">Separator</text>}
        </g>

        {/* PIPE: Separator to Column */}
        <line x1="1020" y1="240" x2="1110" y2="240" stroke="#555" strokeWidth="3" />
        <circle cx="1050" cy="240" r="3" fill="#555">
          <animate attributeName="cx" values="1020;1110" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* COLUMN C-1 */}
        <g transform="translate(1150, 240)">
          <ellipse cx="0" cy="-80" rx="35" ry="8" fill="#1a1a1a" stroke="#555" strokeWidth="2" />
          <rect x="-35" y="-80" width="70" height="160" fill="#2a2a2a" stroke="#555" strokeWidth="2" filter="url(#equipmentShadow)" />
          <ellipse cx="0" cy="80" rx="35" ry="8" fill="#2a2a2a" stroke="#555" strokeWidth="2" />
          
          {/* Trays */}
          {[-60, -40, -20, 0, 20, 40, 60].map(y => (
            <line key={y} x1="-28" y1={y} x2="28" y2={y} stroke="#444" strokeWidth="1" />
          ))}
          
          <text x="0" y="105" fill="#aaa" fontSize="11" textAnchor="middle" fontWeight="600">C-1</text>
          {interactive && <text x="0" y="117" fill="#888" fontSize="9" textAnchor="middle">Column</text>}
        </g>

        {/* Status indicators overlay */}
        {interactive && (
          <>
            {/* Sensor quality badge */}
            <g transform="translate(50, 30)">
              <rect x="0" y="0" width="140" height="24" rx="4" fill="#1e1e1e" stroke="#444" strokeWidth="1" />
              <text x="70" y="16" fill={sensorQuality === "good" ? "#0F9F9F" : sensorQuality === "suspect" ? "#D4A547" : "#D4653F"} fontSize="10" textAnchor="middle" fontWeight="500">
                Instrument: {sensorQuality.toUpperCase()}
              </text>
            </g>
            
            {/* Operating mode badge */}
            <g transform="translate(200, 30)">
              <rect x="0" y="0" width="110" height="24" rx="4" fill="#1e1e1e" stroke="#444" strokeWidth="1" />
              <text x="55" y="16" fill="#999" fontSize="10" textAnchor="middle" fontWeight="500">
                Mode: {opMode === "steady" ? "Steady" : "Transient"}
              </text>
            </g>
            
            {/* Preheat envelope status */}
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
          <button 
            onClick={() => setSelectedUnit(null)}
            className="absolute top-2 right-2 text-[#888] hover:text-white text-sm font-bold w-6 h-6 flex items-center justify-center"
          >
            ✕
          </button>
          
          {selectedUnit === 'e1' && (
            <>
              <h4 className="text-[#aaa] text-sm font-bold mb-2">E-1 Feed/Effluent Exchanger</h4>
              <p className="text-[#ccc] text-xs leading-relaxed">Cold side outlet: {currentTemp.toFixed(1)}{units}</p>
              <p className="text-[#ccc] text-xs leading-relaxed mt-1">Hot side outlet: {feedEffluentTemp.toFixed(0)}{units}</p>
              {preheatActive && (
                <p className="text-[#ccc] text-xs mt-2 font-semibold">Status: {preheatStatus}</p>
              )}
            </>
          )}
          
          {selectedUnit === 'tcv01a' && (
            <>
              <h4 className="text-[#aaa] text-sm font-bold mb-2">TCV-01A Feed Bypass</h4>
              <p className="text-[#ccc] text-xs leading-relaxed">
                Status: {valveStates.tcv01a}
              </p>
              {valveStates.tcv01a === "OPEN" && (
                <p className="text-[#B47A1F] text-xs mt-2 italic">Reducing preheat effectiveness</p>
              )}
            </>
          )}
          
          {selectedUnit === 'tcv01b' && (
            <>
              <h4 className="text-[#aaa] text-sm font-bold mb-2">TCV-01B Primary Feed Control</h4>
              <p className="text-[#ccc] text-xs leading-relaxed">
                Status: {valveStates.tcv01b}
              </p>
              <p className="text-[#ccc] text-xs leading-relaxed mt-1">Routing feed to tube side of E-1</p>
            </>
          )}
          
          {selectedUnit === 'tcv02a' && (
            <>
              <h4 className="text-[#aaa] text-sm font-bold mb-2">TCV-02A Effluent Control</h4>
              <p className="text-[#ccc] text-xs leading-relaxed">
                Status: {valveStates.tcv02a}
              </p>
              {valveStates.tcv02a === "MODULATING" && (
                <p className="text-[#B47A1F] text-xs mt-2 italic">Restriction detected — shell heat exchange limited</p>
              )}
            </>
          )}
          
          {selectedUnit === 'tcv02b' && (
            <>
              <h4 className="text-[#aaa] text-sm font-bold mb-2">TCV-02B Shell Bypass</h4>
              <p className="text-[#ccc] text-xs leading-relaxed">
                Status: {valveStates.tcv02b}
              </p>
              {valveStates.tcv02b !== "CLOSED" && (
                <p className="text-[#B47A1F] text-xs mt-2 italic">Bypassing shell side — heat recovery reduced</p>
              )}
            </>
          )}
          
          {selectedUnit === 'r1' && (
            <>
              <h4 className="text-[#aaa] text-sm font-bold mb-2">R-1 Reactor</h4>
              <p className="text-[#ccc] text-xs leading-relaxed">Temperature: {currentTemp.toFixed(1)}{units}</p>
              <p className="text-[#ccc] text-xs leading-relaxed mt-1">Rate-of-rise: {slope.toFixed(2)} {units}/min</p>
              {bedImbalance && bedImbalance.severity !== "NONE" && (
                <>
                  <p className="text-[#ccc] text-xs leading-relaxed mt-1">Dominant Bed: Bed {bedImbalance.dominantBed}</p>
                  <p className="text-[#ccc] text-xs leading-relaxed">ΔBed: {bedImbalance.bedDelta}{units}</p>
                </>
              )}
              {nearest && (
                <p className="text-[#D4A547] text-xs mt-2 font-semibold">
                  {nearest.name} in {typeof timeToNearest === 'number' && timeToNearest < Infinity ? Math.round(timeToNearest) : '—'} min
                </p>
              )}
            </>
          )}
          
          {selectedUnit === 'e2' && (
            <>
              <h4 className="text-[#aaa] text-sm font-bold mb-2">E-2 Effluent Cooler</h4>
              <p className="text-[#ccc] text-xs leading-relaxed">Capacity: {coolingCapacity}</p>
              <p className="text-[#ccc] text-xs leading-relaxed mt-1">
                Status: {equipment.effluentCooler ? "Online" : "OFFLINE"}
              </p>
              {coolingCapacity === "CONSTRAINED" && (
                <p className="text-[#A13A1F] text-xs mt-2 font-semibold">Heat removal limited</p>
              )}
            </>
          )}
          
          {selectedUnit === 'h2' && (
            <>
              <h4 className="text-[#aaa] text-sm font-bold mb-2">H2-1 Compressor Margin</h4>
              <p className="text-[#ccc] text-xs leading-relaxed">
                Hydrogen margin: {equipment.h2Compressor ? "Available" : "Limited"}
              </p>
              {!equipment.h2Compressor && (
                <p className="text-[#B47A1F] text-xs mt-2 italic">Constrains response options</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}