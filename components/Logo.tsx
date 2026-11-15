/**
 * GainsTalk mark: a dumbbell whose two heads sit inside message bubbles,
 * joined by one continuous rod in the bubble color. Client side green, coach side blue.
 * "dark" is for navy backgrounds, "light" for white ones.
 */
const COLORS = {
  dark: { bubble: "#FFFFFF", client: "#1FA971", coach: "#3049F0", rod: "#FFFFFF" },
  light: { bubble: "#16183A", client: "#6FE3B4", coach: "#8FA6FF", rod: "#16183A" },
};

// cap, outer plate, inner plate (left side; the right side mirrors it)
const PLATES: [number, number, number, number, number][] = [
  [7, 3, 44, 8, 1.5],
  [10, 6, 37, 22, 2.5],
  [16, 8, 32, 32, 3],
];

export function LogoMark({ size = 24, variant = "dark", label }: { size?: number; variant?: "dark" | "light"; label?: string }) {
  const c = COLORS[variant];
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true as const };
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" {...a11y}>
      <rect x="3" y="26" width="31" height="44" rx="11" fill={c.bubble} />
      <path d="M7 63 L2 80 L17 68 Z" fill={c.bubble} />
      <rect x="66" y="26" width="31" height="44" rx="11" fill={c.bubble} />
      <path d="M93 63 L98 80 L83 68 Z" fill={c.bubble} />
      {/* One rod from plate to plate, in the bubble color, under the plates */}
      <rect x="23" y="45" width="54" height="6" rx="3" fill={c.rod} />
      {PLATES.map(([x, w, y, h, rx]) => (
        <g key={x}>
          <rect x={x} y={y} width={w} height={h} rx={rx} fill={c.client} />
          <rect x={100 - x - w} y={y} width={w} height={h} rx={rx} fill={c.coach} />
        </g>
      ))}
    </svg>
  );
}
