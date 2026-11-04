"use client";

/**
 * SVG ring gauge — balance / credit score on the dashboard.
 * `progress` is 0–1 (how much of the ring is filled).
 */

type CircularGaugeProps = {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor: string;
  centerValue: string;
  centerLabel: string;
  centerSublabel?: string;
};

export function CircularGauge({
  progress,
  size = 148,
  strokeWidth = 10,
  color,
  trackColor,
  centerValue,
  centerLabel,
  centerSublabel,
}: CircularGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const strokeDashoffset = circumference * (1 - clamped);
  const center = size / 2;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
          <p className="text-lg font-bold tracking-tight text-foreground">{centerValue}</p>
          <p className="text-xs font-semibold text-muted-foreground">{centerLabel}</p>
          {centerSublabel ? (
            <p className="text-[11px] text-muted">{centerSublabel}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
