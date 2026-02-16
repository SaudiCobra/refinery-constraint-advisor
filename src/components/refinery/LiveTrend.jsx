import React from "react";
import { LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer } from "recharts";

const LEVEL_COLORS = {
  0: "#0F5F5F",
  1: "#B47A1F",
  2: "#A13A1F",
  3: "#7A0F0F",
};

export default function LiveTrend({ samples, limits, escalationLevel, units }) {
  const lineColor = LEVEL_COLORS[escalationLevel] || "#0F5F5F";
  
  const data = samples.map((value, i) => ({
    index: i,
    value: value,
    label: ["t-4", "t-3", "t-2", "t-1", "now"][i],
  }));

  const yMin = Math.min(...samples, limits.hi || 0, limits.hihi || 0) - 10;
  const yMax = Math.max(...samples, limits.hi || 0, limits.hihi || 0, limits.trip || 0) + 10;

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <XAxis 
            dataKey="label" 
            stroke="#555" 
            tick={{ fill: "#888", fontSize: 11 }}
            axisLine={{ stroke: "#333" }}
          />
          <YAxis 
            stroke="#555" 
            tick={{ fill: "#888", fontSize: 11 }}
            axisLine={{ stroke: "#333" }}
            domain={[yMin, yMax]}
            label={{ value: units, angle: -90, position: "insideLeft", fill: "#666", fontSize: 11 }}
          />
          {limits.hi && (
            <ReferenceLine 
              y={limits.hi} 
              stroke="#B47A1F" 
              strokeDasharray="3 3" 
              strokeWidth={1}
              label={{ value: "HI", position: "right", fill: "#B47A1F", fontSize: 10 }}
            />
          )}
          {limits.hihi && (
            <ReferenceLine 
              y={limits.hihi} 
              stroke="#A13A1F" 
              strokeDasharray="3 3" 
              strokeWidth={1}
              label={{ value: "HI-HI", position: "right", fill: "#A13A1F", fontSize: 10 }}
            />
          )}
          {limits.trip && (
            <ReferenceLine 
              y={limits.trip} 
              stroke="#7A0F0F" 
              strokeDasharray="5 5" 
              strokeWidth={1.5}
              label={{ value: "TRIP", position: "right", fill: "#7A0F0F", fontSize: 10 }}
            />
          )}
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={lineColor}
            strokeWidth={2.5}
            dot={{ fill: lineColor, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}