interface Props {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  label: string;
  unit: string;
}

export function ProgressRing({ value, max, size = 160, stroke = 14, color = "hsl(var(--lime, 84 80% 50%))", label, unit }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, max > 0 ? value / max : 0);
  const offset = c * (1 - pct);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--border))" strokeWidth={stroke} fill="none" />
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
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-extrabold leading-none">{Math.round(value)}</span>
          <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            di {max} {unit}
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold">{label}</p>
    </div>
  );
}
