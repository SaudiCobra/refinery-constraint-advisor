import React, { useState, useEffect, useRef } from "react";

export default function ScenarioAnnouncer({ label }) {
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false); // controls display:none
  const hideTimerRef = useRef(null);
  const unmountTimerRef = useRef(null);

  useEffect(() => {
    if (!label) return;

    // Cancel any pending timers
    clearTimeout(hideTimerRef.current);
    clearTimeout(unmountTimerRef.current);

    // Mount + fade in
    setRendered(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });

    // After 2s, fade out
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      // After fade-out completes, fully unmount
      unmountTimerRef.current = setTimeout(() => setRendered(false), 260);
    }, 2000);

    return () => {
      clearTimeout(hideTimerRef.current);
      clearTimeout(unmountTimerRef.current);
    };
  }, [label]);

  if (!rendered) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 90,
        right: 40,
        padding: "8px 16px",
        borderRadius: 999,
        background: "rgba(18,24,32,0.92)",
        border: "1px solid rgba(255,255,255,0.18)",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.04em",
        color: "rgba(255,255,255,0.92)",
        boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
        opacity: visible ? 1 : 0,
        transition: visible ? "opacity 160ms ease" : "opacity 220ms ease",
        pointerEvents: "none",
        zIndex: 9980,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}