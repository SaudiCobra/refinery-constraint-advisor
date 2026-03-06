/**
 * PFD / P&ID Icon Components
 * All icons use stroke="currentColor" for dark-mode compatibility.
 * Each icon centers its content at (0,0) so it can be placed with transform="translate(x,y)".
 * Sizes are specified via width/height props (SVG user-units).
 */

import React from "react";

// ── FEED FILTER (strainer symbol) ─────────────────────────────────────────────
// Nozzle left: (-w/2, 0)   Nozzle right: (w/2, 0)
// Nozzle top:  (0, -h/2)   Nozzle bottom: (0, h/2)
export function FeedFilterIcon({ w = 90, h = 120, stroke = "#888", strokeWidth = 3 }) {
  const hw = w / 2;
  const hh = h / 2;
  const bw = w * 0.52;   // body width
  const bh = h * 0.86;   // body height
  const bhw = bw / 2;
  const bhh = bh / 2;

  return (
    <g stroke={stroke} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Nozzle stubs */}
      <line x1={0} y1={-hh} x2={0} y2={-bhh} strokeWidth={strokeWidth * 0.6} />
      <line x1={0} y1={bhh} x2={0} y2={hh} strokeWidth={strokeWidth * 0.6} />
      <line x1={-hw} y1={0} x2={-bhw} y2={0} strokeWidth={strokeWidth * 0.6} />
      <line x1={bhw} y1={0} x2={hw} y2={0} strokeWidth={strokeWidth * 0.6} />

      {/* Body rectangle */}
      <rect x={-bhw} y={-bhh} width={bw} height={bh} strokeWidth={strokeWidth} />

      {/* Horizontal filter screens (dashed) */}
      {[-0.3, 0.05, 0.25, 0.42].map((frac, i) => (
        <line
          key={i}
          x1={-bhw} y1={bhh * frac * 2}
          x2={bhw}  y2={bhh * frac * 2}
          strokeWidth={strokeWidth * 0.7}
          strokeDasharray={i === 0 ? "none" : "5 4"}
        />
      ))}

      {/* Centre filter element (dashed U-path) */}
      <path
        d={`M ${bhw * 0.7},0 H ${bhw * 0.26} V ${bhh * 0.5} H ${-bhw * 0.26} V 0 H ${-bhw * 0.7}`}
        strokeWidth={strokeWidth * 0.75}
        strokeDasharray="3 2"
      />
    </g>
  );
}

// ── SHELL-AND-TUBE HEAT EXCHANGER (ISA circle + zigzag chevrons) ──────────────
// Tube-side nozzles:   left (-w/2, 0)   right (w/2, 0)  — main flow
// Shell-side nozzles:  top-left, bottom-right (offset from center ellipses)
export function ShellTubeHXIcon({ w = 260, h = 160, strokeColor = "#888", strokeWidth = 3, tubeThermalColor = "#888", shellThermalColor = "#888" }) {
  const hw = w / 2;
  const hh = h / 2;
  const r = Math.min(hw, hh) * 0.38; // circle radius
  const chevW = hw * 0.55;           // chevron half-span

  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Left endcap ellipse */}
      <ellipse cx={-hw} cy={0} rx={10} ry={hh - 8} stroke={strokeColor} strokeWidth={strokeWidth * 0.8} />
      {/* Body shell */}
      <rect x={-hw} y={-hh + 8} width={w} height={h - 16}
            fill="#2a2a2a" stroke={strokeColor} strokeWidth={strokeWidth} />
      {/* Right endcap ellipse */}
      <ellipse cx={hw} cy={0} rx={10} ry={hh - 8} stroke={strokeColor} strokeWidth={strokeWidth * 0.8} />

      {/* Thermal tint fill */}
      <rect x={-hw + 12} y={-hh + 18} width={w - 24} height={h - 36}
            fill={tubeThermalColor} opacity={0.1} />

      {/* Horizontal tube-bundle lines */}
      {[-50, -35, -20, -5, 10, 25, 40, 55].map(y => (
        <line key={y} x1={-hw + 12} y1={y} x2={hw - 12} y2={y}
              stroke="#444" strokeWidth={1.5} opacity={0.9} />
      ))}

      {/* ISA chevron flow arrows (tube side) */}
      <path
        d={`M ${-chevW} ${-r * 0.7} H ${-chevW * 0.12} L ${chevW * 0.38} 0 L ${-chevW * 0.12} ${r * 0.7} H ${-chevW}`}
        stroke={tubeThermalColor} strokeWidth={strokeWidth * 0.9} opacity={0.85}
      />

      {/* Shell-side nozzle indicators */}
      <circle cx={-hw} cy={0} r={5} fill="#333" stroke={tubeThermalColor} strokeWidth={2} />
      <circle cx={hw}  cy={0} r={5} fill="#333" stroke={tubeThermalColor} strokeWidth={2} />
      <circle cx={-hw} cy={-hh + 18} r={5} fill="#333" stroke={shellThermalColor} strokeWidth={2} />
      <circle cx={hw}  cy={hh - 18}  r={5} fill="#333" stroke={shellThermalColor} strokeWidth={2} />
    </g>
  );
}

// ── EFFLUENT COOLER (ISA air-fin / cooler: circle + right-side fins) ──────────
// Inlet nozzle: (-w/2, 0)   Outlet nozzle: (w/2, 0)
export function CoolerIcon({ w = 160, h = 180, stroke = "#2F5D80", bodyStroke = "#888", strokeWidth = 3 }) {
  const hw = w / 2;
  const hh = h / 2;
  // circle centered slightly left, fins on right
  const cr = Math.min(hw * 0.8, hh * 0.72); // circle radius

  // Scale the provided SVG geometry (original viewBox 70.866 × 70.866) to fit our box
  const scale = (Math.min(w, h) * 0.85) / 70.866;
  const ox = -hw * 0.12; // horizontal offset to center visually
  const oy = -hh * 0.1;

  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round"
       transform={`translate(${ox}, ${oy}) scale(${scale})`}>
      {/* Origin is now scaled from SVG center ≈ (35.4, 35.4) */}
      <g transform="translate(-35.4, -35.4)">
        {/* Body rect behind everything for fill */}
        <rect x={0} y={0} width={70.866} height={70.866} fill="#2a2a2a" opacity={1} stroke="none" />

        {/* Main circle (shell) */}
        <path
          d="M 50.357143 30.151857 A 14.0625 13.660714 0 1 1  22.232143,30.151857 A 14.0625 13.660714 0 1 1  50.357143 30.151857 z"
          stroke={bodyStroke} strokeWidth={1.8 / scale} />

        {/* Vertical divider line */}
        <path d="M 27.232143,11.758999 C 27.053571,50.241142 27.053571,50.419714 27.053571,50.419714"
              stroke={bodyStroke} strokeWidth={1.8 / scale} />

        {/* Top horizontal fin */}
        <path d="M 40.007716,19.478916 H 58.608231"
              stroke={stroke} strokeWidth={2.2 / scale} />
        {/* Bottom horizontal fin */}
        <path d="M 39.892144,41.340764 H 58.545582"
              stroke={stroke} strokeWidth={2.2 / scale} />

        {/* Top vertical connector */}
        <path d="M 39.53549,18.859208 V 26.989858"
              stroke={stroke} strokeWidth={2.2 / scale} />
        {/* Top crossbar */}
        <path d="M 38.933977,26.395486 H 45.483653"
              stroke={stroke} strokeWidth={2 / scale} />
        {/* Bottom vertical connector */}
        <path d="M 39.386972,33.885902 V 41.963799"
              stroke={stroke} strokeWidth={2.2 / scale} />
        {/* Bottom crossbar */}
        <path d="M 38.761215,34.008648 H 45.776683"
              stroke={stroke} strokeWidth={2.4 / scale} />
        {/* Right vertical fin connector */}
        <path d="M 45.055688,25.802041 V 34.482975"
              stroke={stroke} strokeWidth={2.4 / scale} />
      </g>
    </g>
  );
}

// ── CONTROL VALVE (ISA: bowtie + stem + actuator dome) ───────────────────────
// Pipe left: (-size, 0)   Pipe right: (size, 0)
// Scale: size ≈ 9 matches the current polygon size
export function ControlValveIcon({ size = 9, fill = "#2F5D80", stroke = "#555", strokeWidth = 1.5 }) {
  // Scale from the provided 100×100 viewBox to ±size units
  // Original center: (50, 57) — the midpoint of the bowtie
  // We'll map: 0→-size, 100→+size in x; 22→-size*1.8, 72→+size*0.8 in y
  const s = size / 50; // scale factor: 50 SVG units → size px

  return (
    <g fill="none" stroke={stroke} strokeWidth={strokeWidth}
       strokeLinejoin="round" strokeMiterlimit="10"
       transform={`scale(${s}) translate(-50, -57)`}>
      {/* Actuator stem */}
      <path d="M50 32 V56" strokeWidth={strokeWidth / s} />
      {/* Actuator dome (triangle = handwheel top) */}
      <path d="M37.648 31.852 C40.395 26.16 45.029 22.728 50 22.728 C54.971 22.728 59.605 26.16 62.352 31.852 Z"
            fill={fill} strokeWidth={strokeWidth / s} />
      {/* Left bowtie triangle */}
      <path d="M25 42 L50 57 L25 72 Z" fill={fill} strokeWidth={strokeWidth / s} />
      {/* Right bowtie triangle */}
      <path d="M75 42 L50 57 L75 72 Z" fill={fill} strokeWidth={strokeWidth / s} />
    </g>
  );
}

// ── KO DRUM (vertical vessel, ISA style) ─────────────────────────────────────
// Inlet nozzle: (0, -h/2)   Outlet nozzles at bottom or side
// Prepared as reusable component; not yet placed in main PFD
export function KODrumIcon({ w = 60, h = 160, stroke = "#888", strokeWidth = 3 }) {
  const hw = w / 2;
  const hh = h / 2;

  // Scale from original SVG viewBox 70.866 × 70.866
  // Original geometry spans x: ~21.5→46.2, y: ~5.96→70.66
  // We map to our bounding box centered at 0,0
  const origW = 46.26 - 21.51;   // ≈ 24.75
  const origH = 70.66 - 5.96;    // ≈ 64.7
  const scaleX = w / origW;
  const scaleY = h / origH;
  const scale = Math.min(scaleX, scaleY);
  const cx = (46.26 + 21.51) / 2; // ≈ 33.9
  const cy = (70.66 + 5.96) / 2;  // ≈ 38.3

  return (
    <g fill="none" stroke={stroke} strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit="4"
       transform={`scale(${scale}) translate(${-cx}, ${-cy})`}>
      <path
        d="m 21.513445,64.721847 0,-53.188474 m 24.74609,0 0,53.188474
           m 0,-53.188474 c -3.06152,-3.6035133 -7.64648,-5.7617253 -12.3291,-5.7617253
           c -4.68261,0 -9.27246,2.250987 -12.3291,5.8496123
           m 0,53.007807 c 2.96875,3.69141 7.5586,5.94239 12.3291,5.94239
           c 4.68262,0 9.26758,-2.25098 12.3291,-5.84961
           m -24.74609,-44.912112 24.74609,0
           m -24.74609,6.660161 24.74609,0"
        strokeWidth={strokeWidth / scale}
      />
    </g>
  );
}