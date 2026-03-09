import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import moment from "moment";
import { useTheme } from "@/components/refinery/ThemeContext";

export default function AcknowledgeSystem() {
  const [ack, setAck] = useState(null);
  const { theme } = useTheme();
  const isLight = theme === "light";

  const handleAck = () => {
    setAck({ time: moment().format("HH:mm"), owner: "Console Operator (demo)" });
  };

  const handleClear = () => setAck(null);

  if (ack) {
    return (
      <div className={cn("flex items-center gap-4 rounded-b-lg rounded-t-none border px-5 py-3 transition-colors duration-300", isLight ? "bg-[#fef9ec] border-[#e8d5a0]" : "bg-[#1e1e1e] border-[#333]")}>
        <div className="w-2 h-2 rounded-full bg-amber-500" />
        <div className="flex-1">
          <p className="text-amber-400 text-sm font-medium">Acknowledged at {ack.time}</p>
          <p className={cn("text-xs", isLight ? "text-[#6b7280]" : "text-[#777]")}>Under observation — Owner: {ack.owner}</p>
        </div>
        <Button onClick={handleClear} variant="outline" size="sm" className={cn("bg-transparent text-xs", isLight ? "border-[#d1d8e8] text-[#6b7280] hover:text-[#374151]" : "border-[#444] text-[#aaa] hover:text-white")}>
          Clear
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-between rounded-b-lg rounded-t-none border px-5 py-3 transition-colors duration-300", isLight ? "bg-[#f4f6fb] border-[#d1d8e8]" : "bg-[#161616] border-[#2a2a2a]")}>
      <p className={cn("text-xs", isLight ? "text-[#9ca3af]" : "text-[#555]")}>Final action — operator confirms awareness of active drift.</p>
      <Button
        onClick={handleAck}
        className={cn("px-6 text-sm border", isLight ? "bg-[#e8ecf4] border-[#d1d8e8] text-[#374151] hover:bg-[#dde2ee]" : "bg-[#2a2a2a] border-[#444] text-[#ccc] hover:text-white hover:border-[#666]")}
      >
        Acknowledge Early Warning
      </Button>
    </div>
  );
}