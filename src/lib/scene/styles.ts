export const ROOM_STYLES = [
  { name: "Cozy", intent: "warm lighting; moss #65755b fabric seating, honey #b88653 wood tables, warm ivory #e6dfcd accents; inviting conversational groups" },
  { name: "Minimal", intent: "daylight; chalk #e4e7e4 fabric seating, pale oak #c5bba5 wood, charcoal #34383b accents; fewer unnecessary objects and generous clear floor" },
  { name: "Luxury", intent: "warm lighting; deep emerald #24483d fabric seating, walnut #694a35 wood, champagne #bdab7a metal accents; balanced seating and restrained contrast" },
  { name: "Japanese", intent: "daylight; sage #a2ac93 fabric, natural oak #c1a77c wood and ink #333832 accents; low visual clutter and balanced seating" },
  { name: "Modern Cafe", intent: "warm lighting; terracotta #af6551 fabric, warm oak #b68a5c wood, forest #355948 accents; dining furniture, sociable seating and a clear service path" },
  { name: "Industrial", intent: "neutral lighting; charcoal #41464b metal, tobacco #8e654b leather, weathered #987552 wood; practical open circulation" },
] as const;

export function styleInstruction(style: (typeof ROOM_STYLES)[number]) {
  return `Transform the entire room into a ${style.name} style: ${style.intent}. Make a clearly visible, coordinated transformation across the main seating, tables and storage, using both material and colour operations rather than only lighting or tiny adjustments. Update scene lighting and layout where useful. Preserve locked architecture, real-world dimensions, capacity and clear walkways. Reuse existing furniture rather than replacing everything. Propose a coherent room-wide transformation with a short helpful summary for review; do not apply automatically.`;
}