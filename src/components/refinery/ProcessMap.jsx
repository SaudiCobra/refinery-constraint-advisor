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

  const feedEffluentTemp = Math.max(currentTemp - 50, 280);
  const reactorOutletTemp = currentTemp + 15;

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

        {/* PIPE: Feed to E-1 */}
        <line x1="82" y1="240" x2="170" y2="240" stroke="#555" strokeWidth="4" />
        <circle cx="110" cy="240" r="4" fill={baseColor}>
          <animate attributeName="cx" values="82;170" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* FEED/EFFLUENT HEAT EXCHANGER E-1 */}
        <g 
          transform="translate(220, 240)" 
          onClick={() => handleUnitClick('e1')}
          className={cn(interactive && "cursor-pointer hover:opacity-80 transition-opacity")}
        >
          {/* Main shell */}
          <rect x="-35" y="-50" width="70" height="100" rx="10" fill="#2a2a2a" stroke={preheatColor} strokeWidth="3" filter="url(#equipmentShadow)" />
          {/* Tube bundle indication */}
          <line x1="-28" y1="-35" x2="28" y2="-35" stroke="#444" strokeWidth="1.5" />
          <line x1="-28" y1="-25" x2="28" y2="-25" stroke="#444" strokeWidth="1.5" />
          <line x1="-28" y1="-15" x2="28" y2="-15" stroke="#444" strokeWidth="1.5" />
          <line x1="-28" y1="-5" x2="28" y2="-5" stroke="#444" strokeWidth="1.5" />
          <line x1="-28" y1="5" x2="28" y2="5" stroke="#444" strokeWidth="1.5" />
          <line x1="-28" y1="15" x2="28" y2="15" stroke="#444" strokeWidth="1.5" />
          <line x1="-28" y1="25" x2="28" y2="25" stroke="#444" strokeWidth="1.5" />
          <line x1="-28" y1="35" x2="28" y2="35" stroke="#444" strokeWidth="1.5" />
          
          {/* Shell side flow arrows */}
          <path d="M -30,-42 L -25,-42 L -27,-39 M -25,-42 L -27,-45" stroke="#666" strokeWidth="1" fill="none" />
          <path d="M 30,42 L 25,42 L 27,39 M 25,42 L 27,45" stroke="#666" strokeWidth="1" fill="none" />
          
          {preheatActive && preheatStatus?.includes("Stress") && (
            <rect x="-38" y="-50" width="5" height="100" fill="#A13A1F" rx="2" />
          )}
          
          <text x="0" y="70" fill="#aaa" fontSize="11" textAnchor="middle" fontWeight="600">E-1</text>
          {interactive && <text x="0" y="82" fill="#888" fontSize="9" textAnchor="middle">Feed/Effluent HX</text>}
        </g>

        {/* Feed outlet temp (after E-1) */}
        {interactive && (
          <text x="220" y="180" fill={preheatColor} fontSize="10" textAnchor="middle" fontWeight="500">
            T={currentTemp.toFixed(1)}{units}
          </text>
        )}

        {/* BYPASS PATH AROUND E-1 (BV-1) */}
        <g opacity={equipment.bypassValve ? 1 : 0.4}>
          <line x1="170" y1="240" x2="170" y2="160" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          <line x1="170" y1="160" x2="270" y2="160" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          <line x1="270" y1="160" x2="270" y2="240" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          
          <g transform="translate(220, 160)" onClick={() => handleUnitClick('bv1')} className={cn(interactive && "cursor-pointer")}>
            <polygon points="-10,-8 10,-8 8,0 10,8 -10,8 -8,0" fill={equipment.bypassValve ? "#2F5D80" : "#7A0F0F"} stroke="#555" strokeWidth="1.5" />
            <text x="0" y="-15" fill="#888" fontSize="8" textAnchor="middle" fontWeight="500">BV-1</text>
            {!equipment.bypassValve && <text x="0" y="25" fill="#A13A1F" fontSize="8" textAnchor="middle">OOS</text>}
          </g>
        </g>

        {/* PIPE: E-1 to Reactor */}
        <line x1="255" y1="240" x2="380" y2="240" stroke="#555" strokeWidth="4" />
        <circle cx="300" cy="240" r="4" fill={baseColor}>
          <animate attributeName="cx" values="255;380" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* REACTOR R-1 */}
        <g 
          transform="translate(450, 240)" 
          onClick={() => handleUnitClick('r1')}
          className={cn(interactive && "cursor-pointer hover:opacity-80 transition-opacity")}
        >
          <ellipse cx="0" cy="-55" rx="50" ry="10" fill="#1a1a1a" stroke={baseColor} strokeWidth="2" />
          <rect x="-50" y="-55" width="100" height="110" fill="#2a2a2a" stroke={baseColor} strokeWidth="4" filter="url(#equipmentShadow)" />
          <ellipse cx="0" cy="55" rx="50" ry="10" fill="#2a2a2a" stroke={baseColor} strokeWidth="2" />
          
          {escalationLevel >= 2 && (
            <rect x="-45" y="-50" width="90" height="100" fill="url(#reactorGlow)" className={escalationLevel >= 3 ? "animate-[pulse_1.2s_ease-in-out_infinite]" : ""} />
          )}
          
          <text x="0" y="80" fill="#aaa" fontSize="13" textAnchor="middle" fontWeight="bold">R-1</text>
          {interactive && <text x="0" y="93" fill="#888" fontSize="10" textAnchor="middle">Reactor</text>}
        </g>

        {/* Reactor temperature and slope display */}
        {interactive && (
          <>
            <text x="450" y="135" fill={baseColor} fontSize="12" textAnchor="middle" fontWeight="700">
              T={currentTemp.toFixed(1)}{units}
            </text>
            {slope > 0 && (
              <text x="450" y="150" fill={baseColor} fontSize="10" textAnchor="middle">
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

        {/* PIPE: Reactor to E-2 (effluent side of E-1) */}
        <line x1="500" y1="240" x2="580" y2="240" stroke="#555" strokeWidth="4" />
        <circle cx="530" cy="240" r="4" fill={baseColor}>
          <animate attributeName="cx" values="500;580" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* Return path to E-1 hot side (effluent cooling in E-1) */}
        <line x1="580" y1="240" x2="580" y2="310" stroke="#555" strokeWidth="3" strokeDasharray="5,3" />
        <line x1="580" y1="310" x2="220" y2="310" stroke="#555" strokeWidth="3" strokeDasharray="5,3" />
        <circle cx="400" cy="310" r="3" fill="#A13A1F" opacity="0.6">
          <animate attributeName="cx" values="580;220" dur={animationSpeed} repeatCount="indefinite" />
        </circle>
        {interactive && (
          <text x="400" y="330" fill="#888" fontSize="9" textAnchor="middle">Hot effluent to E-1</text>
        )}

        {/* PIPE: From E-1 hot side outlet to E-2 */}
        <line x1="185" y1="310" x2="185" y2="240" stroke="#555" strokeWidth="3" strokeDasharray="5,3" />
        <line x1="185" y1="240" x2="670" y2="240" stroke="#555" strokeWidth="4" />
        <circle cx="400" cy="240" r="4" fill={baseColor}>
          <animate attributeName="cx" values="185;670" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* Effluent temp after E-1 */}
        {interactive && (
          <text x="185" y="330" fill="#888" fontSize="9" textAnchor="middle">
            T={feedEffluentTemp.toFixed(0)}{units}
          </text>
        )}

        {/* EFFLUENT COOLER E-2 */}
        <g 
          transform="translate(740, 240)" 
          onClick={() => handleUnitClick('e2')}
          className={cn(
            interactive && "cursor-pointer hover:opacity-80 transition-opacity",
            coolingCapacity === "CONSTRAINED" && "animate-[wiggle_2s_ease-in-out_infinite]"
          )}
        >
          <rect x="-40" y="-45" width="80" height="90" rx="10" fill="#2a2a2a" stroke={coolerColor} strokeWidth="3" filter="url(#equipmentShadow)" />
          
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
          <text x="740" y="330" fill={coolerColor} fontSize="10" textAnchor="middle" fontWeight="600">
            {coolingCapacity}
          </text>
        )}

        {/* BYPASS PATH AROUND E-2 (BV-2) */}
        <g opacity={equipment.bypassValve ? 1 : 0.4}>
          <line x1="670" y1="240" x2="670" y2="160" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          <line x1="670" y1="160" x2="810" y2="160" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          <line x1="810" y1="160" x2="810" y2="240" stroke="#555" strokeWidth="3" strokeDasharray="4,4" />
          
          <g transform="translate(740, 160)" className={cn(interactive && "cursor-pointer")}>
            <polygon points="-10,-8 10,-8 8,0 10,8 -10,8 -8,0" fill={equipment.bypassValve ? "#2F5D80" : "#7A0F0F"} stroke="#555" strokeWidth="1.5" />
            <text x="0" y="-15" fill="#888" fontSize="8" textAnchor="middle" fontWeight="500">BV-2</text>
          </g>
        </g>

        {/* PIPE: E-2 to Separator */}
        <line x1="780" y1="240" x2="900" y2="240" stroke="#555" strokeWidth="4" />
        <circle cx="830" cy="240" r="4" fill={baseColor}>
          <animate attributeName="cx" values="780;900" dur={animationSpeed} repeatCount="indefinite" />
        </circle>

        {/* SEPARATOR D-1 */}
        <g transform="translate(960, 240)">
          <ellipse cx="0" cy="-35" rx="30" ry="8" fill="#1a1a1a" stroke="#555" strokeWidth="2" />
          <rect x="-30" y="-35" width="60" height="70" fill="#2a2a2a" stroke="#555" strokeWidth="2" filter="url(#equipmentShadow)" />
          <ellipse cx="0" cy="35" rx="30" ry="8" fill="#2a2a2a" stroke="#555" strokeWidth="2" />
          
          <text x="0" y="60" fill="#aaa" fontSize="11" textAnchor="middle" fontWeight="600">D-1</text>
          {interactive && <text x="0" y="72" fill="#888" fontSize="9" textAnchor="middle">Separator</text>}
        </g>

        {/* PIPE: Separator to Column */}
        <line x1="990" y1="240" x2="1080" y2="240" stroke="#555" strokeWidth="3" />
        <circle cx="1020" cy="240" r="3" fill="#555">
          <animate attributeName="cx" values="990;1080" dur={animationSpeed} repeatCount="indefinite" />
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
          
          {selectedUnit === 'bv1' && (
            <>
              <h4 className="text-[#aaa] text-sm font-bold mb-2">BV-1 HX Bypass Valve</h4>
              <p className="text-[#ccc] text-xs leading-relaxed">
                Status: {equipment.bypassValve ? "Available" : "Out of Service"}
              </p>
              {equipment.bypassValve && (
                <p className="text-[#2F5D80] text-xs mt-2 italic">Bypass path ready if needed</p>
              )}
            </>
          )}
          
          {selectedUnit === 'r1' && (
            <>
              <h4 className="text-[#aaa] text-sm font-bold mb-2">R-1 Reactor</h4>
              <p className="text-[#ccc] text-xs leading-relaxed">Temperature: {currentTemp.toFixed(1)}{units}</p>
              <p className="text-[#ccc] text-xs leading-relaxed mt-1">Rate-of-rise: {slope.toFixed(2)} {units}/min</p>
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