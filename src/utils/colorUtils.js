export const DEFAULT_PALETTE = [
  "#f44336",
  "#e91e63",
  "#9c27b0",
  "#673ab7",
  "#3f51b5",
  "#2196f3",
  "#03a9f4",
  "#00bcd4",
  "#009688",
  "#4caf50",
  "#8bc34a",
  "#cddc39",
  "#ffeb3b",
  "#ffc107",
  "#ff9800",
  "#ff5722",
  "#795548",
  "#607d8b",
  "#ff6b6b",
  "#7c4dff",
  "#00b894",
  "#fdcb6e",
];

const normalize = (c) => (c || "").toString().trim().toLowerCase();

// Generate an array of distinct colors for wheel sectors.
// Ensures generated colors are not exactly equal to any of the items' colors.
export function generateDistinctColors(items = [], count = null) {
  const needed = count ?? items.length;
  const forbidden = new Set(
    items.map((it) => normalize(it?.color)).filter(Boolean),
  );

  const palette = DEFAULT_PALETTE.filter((c) => !forbidden.has(normalize(c)));

  const results = [];
  let pIdx = 0;

  for (let i = 0; i < needed; i++) {
    if (pIdx < palette.length) {
      results.push(palette[pIdx++]);
      continue;
    }

    // Fallback: generate HSL-based color rotating hue to avoid exact matches
    const hue = Math.round((i * 137.508) % 360); // golden angle distribution
    const color = `hsl(${hue} 70% 55%)`;
    if (!forbidden.has(normalize(color))) {
      results.push(color);
    } else {
      // unlikely, but fallback to a hex using hue
      results.push(
        `#${((1 << 24) + ((Math.floor(hue) * 1234567) % 0xffffff)).toString(16).slice(1)}`,
      );
    }
  }

  return results;
}

export function pickReadableTextColor(bgColor) {
  // very small utility: for hex colors choose black/white; for hsl return black
  if (!bgColor) return "#000";
  const s = bgColor.toString().trim();
  if (s.startsWith("hsl")) return "#000";
  const hex = s.replace("#", "");
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "#000" : "#fff";
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000" : "#fff";
}
