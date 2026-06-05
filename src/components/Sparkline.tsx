interface Props {
  data: number[];
  width?: number;
  height?: number;
  color: string;
}

// Compact inline sparkline (no axes), normalized to its own min/max.
export function Sparkline({ data, width = 56, height = 18, color }: Props) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const lastY =
    height - ((data[data.length - 1] - min) / range) * height;

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.25}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={width} cy={lastY} r={1.6} fill={color} />
    </svg>
  );
}
