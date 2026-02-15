import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCENARIOS } from "./calcEngine";

const DEFAULTS = {
  varName: "NHT Reactor Inlet Temperature",
  units: "°C",
  interval: 2,
  samples: [358, 360, 362, 364, 366],
  limits: { hi: 370, hihi: 380, spec: 375, trip: 390, rampRate: "" },
  opMode: "steady",
  sensorQuality: "good",
  equipment: { preheatExchanger: true, effluentCooler: true, bypassValve: true, h2Compressor: true },
  feedFlow: 100000,
};

export default function InputPanel({ state, onChange, onRunDemo }) {
  const [expanded, setExpanded] = useState(false);

  const update = (path, value) => {
    const next = { ...state };
    if (path.includes(".")) {
      const [parent, child] = path.split(".");
      next[parent] = { ...next[parent], [child]: value };
    } else {
      next[path] = value;
    }
    onChange(next);
  };

  const updateSample = (idx, val) => {
    const s = [...state.samples];
    s[idx] = val === "" ? "" : Number(val);
    onChange({ ...state, samples: s });
  };

  const reset = () => onChange({ ...DEFAULTS });

  const sampleLabels = ["t-4", "t-3", "t-2", "t-1", "now"];

  return (
    <div className="border border-[#333] rounded-lg bg-[#1e1e1e] overflow-hidden">
      {/* Collapse Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 text-[#aaa] hover:text-white transition-colors"
      >
        <span className="text-sm font-medium tracking-wide uppercase">Variable Configuration</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-[#333]">
          {/* Variable Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <Field label="Variable Name">
              <Input value={state.varName} onChange={e => update("varName", e.target.value)} className="bg-[#2a2a2a] border-[#444] text-white" />
            </Field>
            <Field label="Units">
              <Input value={state.units} onChange={e => update("units", e.target.value)} className="bg-[#2a2a2a] border-[#444] text-white" />
            </Field>
            <Field label="Sample Interval (min)">
              <Select value={String(state.interval)} onValueChange={v => update("interval", Number(v))}>
                <SelectTrigger className="bg-[#2a2a2a] border-[#444] text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 min</SelectItem>
                  <SelectItem value="2">2 min</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Samples */}
          <div>
            <Label className="text-[#888] text-xs uppercase tracking-wider mb-2 block">Last 5 Samples ({state.units})</Label>
            <div className="grid grid-cols-5 gap-2">
              {sampleLabels.map((lbl, i) => (
                <div key={lbl}>
                  <span className="text-[#666] text-xs block mb-1">{lbl}</span>
                  <Input
                    type="number"
                    value={state.samples[i]}
                    onChange={e => updateSample(i, e.target.value)}
                    className="bg-[#2a2a2a] border-[#444] text-white text-center"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Limits */}
          <div>
            <Label className="text-[#888] text-xs uppercase tracking-wider mb-2 block">Constraint Limits ({state.units})</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                ["hi", "HI"], ["hihi", "HI-HI"], ["spec", "Spec"], ["trip", "Trip"], ["rampRate", "Ramp-rate (°/min)"]
              ].map(([key, label]) => (
                <div key={key}>
                  <span className="text-[#666] text-xs block mb-1">{label}</span>
                  <Input
                    type="number"
                    value={state.limits[key]}
                    onChange={e => update(`limits.${key}`, e.target.value)}
                    className="bg-[#2a2a2a] border-[#444] text-white text-center"
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Operating Mode, Sensor Quality, Feed Flow */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Operating Mode">
              <Select value={state.opMode} onValueChange={v => update("opMode", v)}>
                <SelectTrigger className="bg-[#2a2a2a] border-[#444] text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="steady">Steady</SelectItem>
                  <SelectItem value="transient">Transient</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sensor Quality">
              <Select value={state.sensorQuality} onValueChange={v => update("sensorQuality", v)}>
                <SelectTrigger className="bg-[#2a2a2a] border-[#444] text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="suspect">Suspect</SelectItem>
                  <SelectItem value="bad">Bad</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Feed Flow (kg/h)">
              <Input
                type="number"
                value={state.feedFlow}
                onChange={e => update("feedFlow", Number(e.target.value))}
                className="bg-[#2a2a2a] border-[#444] text-white"
              />
            </Field>
          </div>

          {/* Equipment Availability */}
          <div>
            <Label className="text-[#888] text-xs uppercase tracking-wider mb-2 block">Equipment Availability</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ["preheatExchanger", "Preheat Exchanger"],
                ["effluentCooler", "Effluent Cooler"],
                ["bypassValve", "Bypass Valve"],
                ["h2Compressor", "H₂ Compressor Margin"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => update(`equipment.${key}`, !state.equipment[key])}
                  className={cn(
                    "px-3 py-2 rounded border text-xs font-medium transition-colors",
                    state.equipment[key]
                      ? "bg-green-900/30 border-green-700 text-green-400"
                      : "bg-red-900/30 border-red-700 text-red-400"
                  )}
                >
                  {label}: {state.equipment[key] ? "ON" : "OFF"}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={reset} variant="outline" size="sm" className="border-[#444] text-[#aaa] hover:text-white bg-transparent">
              <RotateCcw className="w-3 h-3 mr-2" /> Reset Defaults
            </Button>
            <div className="border-l border-[#444] mx-1" />
            <span className="text-[#666] text-xs self-center mr-2">Demo Scenarios:</span>
            {SCENARIOS.map((s, i) => (
              <Button
                key={i}
                onClick={() => onRunDemo(i)}
                variant="outline"
                size="sm"
                className="border-[#444] text-[#999] hover:text-white bg-transparent text-xs"
              >
                {s.name}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-[#888] text-xs uppercase tracking-wider mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}