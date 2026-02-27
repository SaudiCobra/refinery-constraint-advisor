import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function AcknowledgeSystem() {
  const [ack, setAck] = useState(null);

  const handleAck = () => {
    setAck({ time: moment().format("HH:mm"), owner: "Console Operator (demo)" });
  };

  const handleClear = () => setAck(null);

  if (ack) {
    return (
      <div className="flex items-center gap-4 bg-[#1e1e1e] border border-[#333] rounded-b-lg rounded-t-none px-5 py-3">
        <div className="w-2 h-2 rounded-full bg-amber-500" />
        <div className="flex-1">
          <p className="text-amber-400 text-sm font-medium">Acknowledged at {ack.time}</p>
          <p className="text-[#777] text-xs">Under observation — Owner: {ack.owner}</p>
        </div>
        <Button onClick={handleClear} variant="outline" size="sm" className="border-[#444] text-[#aaa] hover:text-white bg-transparent text-xs">
          Clear
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-[#161616] border border-[#2a2a2a] rounded-b-lg rounded-t-none px-5 py-3">
      <p className="text-[#555] text-xs">Final action — operator confirms awareness of active drift.</p>
      <Button
        onClick={handleAck}
        className="bg-[#2a2a2a] border border-[#444] text-[#ccc] hover:text-white hover:border-[#666] px-6 text-sm"
      >
        Acknowledge Early Warning
      </Button>
    </div>
  );
}