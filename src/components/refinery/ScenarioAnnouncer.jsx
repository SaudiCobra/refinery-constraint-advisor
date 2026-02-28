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
        padding: "6px 14px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.04em",
        color: "rgba(255,255,255,0.9)",
        opacity: visible ? 0.85 : 0,
        transition: visible ? "opacity 170ms ease" : "opacity 240ms ease",
        pointerEvents: "none",
        zIndex: 9980,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}