interface Props {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  unit: string;
  centerLabel?: string;
  centerSub?: string;
}

export function ProgressRing({
  value, max, size = 160, stroke = 14,
  color = "#c8f04d",
  label, unit, centerLabel, centerSub,
}: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, max > 0 ? value / max : 0);
  const offset = c * (1 - pct);
  const remaining = Math.max(0, max - value);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-border)" strokeWidth={stroke} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className="font-display font-extrabold leading-none"
            style={{ fontSize: size >= 140 ? "2.5rem" : "1.25rem" }}
          >
            {centerLabel ?? Math.round(remaining)}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            {centerSub ?? `${unit} rimasti`}
          </span>
          {size >= 140 && (
            <span className="mt-0.5 text-[10px] text-muted-foreground">
              {Math.round(value)} / {max} {unit}
            </span>
          )}
        </div>
      </div>
      {label && <p className="mt-3 text-sm font-semibold">{label}</p>}
    </div>
  );
}
