import React, { useState, useEffect, useRef } from "react";

export default function ScenarioAnnouncer({ label }) {
  const [opacity, setOpacity] = useState(0);
  const [translateY, setTranslateY] = useState(-6);
  const holdRef = useRef(null);
  const fadeRef = useRef(null);

  useEffect(() => {
    if (!label) return;

    // Clear any in-flight timers
    clearTimeout(holdRef.current);
    clearTimeout(fadeRef.current);

    // Slide + fade in
    setOpacity(0);
    setTranslateY(-6);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setOpacity(0.85);
        setTranslateY(0);
      });
    });

    // After 2s, reduce to resting opacity
    holdRef.current = setTimeout(() => {
      setOpacity(0.35);
    }, 2200);

    return () => {
      clearTimeout(holdRef.current);
      clearTimeout(fadeRef.current);
    };
  }, [label]);

  if (!label) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 90,
        right: 40,
        padding: "6px 14px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.04em",
        color: "rgba(255,255,255,0.9)",
        opacity,
        transform: `translateY(${translateY}px)`,
        transition: "opacity 200ms ease, transform 200ms ease",
        zIndex: 9980,
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}