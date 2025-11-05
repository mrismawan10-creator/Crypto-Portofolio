"use client";

import React from "react";

type Datum = {
  label: string;
  value: number;
  color?: string;
};

function genColor(i: number): string {
  // Gentle HSL palette
  const hue = (i * 57) % 360;
  return `hsl(${hue} 70% 55%)`;
}

export default function PieChart({ data, size = 220, strokeWidth = 0 }: { data: Datum[]; size?: number; strokeWidth?: number }) {
  const filtered = data.filter((d) => Number.isFinite(d.value) && d.value > 0);
  const total = filtered.reduce((acc, d) => acc + d.value, 0);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  let currentAngle = -Math.PI / 2; // start at top

  const slices = filtered.map((d, idx) => {
    const angle = (d.value / total) * Math.PI * 2;
    const start = currentAngle;
    const end = currentAngle + angle;
    currentAngle = end;

    const x1 = center + radius * Math.cos(start);
    const y1 = center + radius * Math.sin(start);
    const x2 = center + radius * Math.cos(end);
    const y2 = center + radius * Math.sin(end);
    const largeArc = angle > Math.PI ? 1 : 0;

    const pathData = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      "Z",
    ].join(" ");

    const color = d.color ?? genColor(idx);
    const percent = total > 0 ? (d.value / total) * 100 : 0;

    return (
      <path key={idx} d={pathData} fill={color} strokeWidth={strokeWidth} stroke="transparent">
        <title>{`${d.label}: ${percent.toFixed(1)}%`}</title>
      </path>
    );
  });

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {total > 0 ? (
          slices
        ) : (
          <circle cx={center} cy={center} r={radius} fill={'hsl(0 0% 92%)'} />
        )}
      </svg>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-[220px]">
        {filtered.map((d, idx) => {
          const color = d.color ?? genColor(idx);
          const percent = total > 0 ? (d.value / total) * 100 : 0;
          return (
            <div key={idx} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ background: color }} />
                <span className="text-sm text-muted-foreground">{d.label}</span>
              </div>
              <span className="text-sm tabular-nums">{percent.toFixed(1)}%</span>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground">No data to visualize</div>
        )}
      </div>
    </div>
  );
}
