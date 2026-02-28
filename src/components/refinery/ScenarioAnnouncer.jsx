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

    // After 1700ms hold, fade out
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      // After fade-out completes, fully unmount
      unmountTimerRef.current = setTimeout(() => setRendered(false), 240);
    }, 1700);

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
        top: 92,
        right: 44,
        padding: 0,
        background: "transparent",
        border: "none",
        borderRadius: 0,
        opacity: visible ? 0.72 : 0,
        transition: visible ? "opacity 120ms ease" : "opacity 200ms ease",
        pointerEvents: "none",
        zIndex: 9980,
        whiteSpace: "nowrap",
      }}
    >
      <div style={{
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.06em",
        color: "rgba(255,255,255,0.72)",
        lineHeight: 1,
      }}>
        {label}
      </div>
      <div style={{
        height: 1,
        width: "54%",
        marginTop: 6,
        background: "rgba(255,255,255,0.12)",
      }} />
    </div>
  );
}