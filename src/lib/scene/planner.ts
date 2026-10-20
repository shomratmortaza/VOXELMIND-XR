import {
  SCENE_SCHEMA_VERSION,
  type ObjectKind,
  type SceneCategory,
  type SceneObject,
  type SceneSpec,
  type Vec3,
} from "./types";
import { defaultMaterial } from "./materials";

/**
 * Local, deterministic rule-based scene planner.
 * This is NOT an AI model: it reads keywords and numbers from the prompt and
 * lays out procedural blockouts. Gate 3 replaces/augments it with a real AI planner.
 */

const DIMS: Record<ObjectKind, Vec3> = {
  floor: [10, 0.1, 10],
  wall: [10, 3, 0.2],
  window: [2, 1.6, 0.08],
  table: [0.9, 0.75, 0.9],
  chair: [0.45, 0.9, 0.45],
  counter: [4, 1.1, 0.8],
  desk: [1.4, 0.75, 0.7],
  sofa: [2, 0.8, 0.9],
  shelf: [1.2, 2, 0.4],
  plant: [0.5, 1.2, 0.5],
  lamp: [0.3, 3.2, 0.3],
  tree: [1.6, 4, 1.6],
  building: [8, 12, 8],
  road: [40, 0.05, 6],
  bench: [1.6, 0.5, 0.5],
  car: [1.9, 1.4, 4.2],
  slide: [1, 2, 3.5],
  box: [1, 1, 1],
};

const PALETTE = {
  warm: { floor: "#8a6a4f", wall: "#e9e2d6", wood: "#6b4a33", accent: "#c98a4b" },
  neutral: { floor: "#9aa0a6", wall: "#eceff1", wood: "#5f6a72", accent: "#2f6fdf" },
  daylight: { floor: "#6f8f5a", wall: "#d8dcd2", wood: "#7a6650", accent: "#e0a23b" },
};

let counter = 0;
export function makeId(prefix = "obj") {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

export function createObject(
  kind: ObjectKind,
  position: Vec3,
  opts: Partial<Omit<SceneObject, "id" | "kind" | "position">> = {},
): SceneObject {
  return {
    id: makeId(kind),
    kind,
    name: opts.name ?? kind.charAt(0).toUpperCase() + kind.slice(1),
    position,
    rotationY: opts.rotationY ?? 0,
    scale: opts.scale ?? [...DIMS[kind]],
    color: opts.color ?? "#bbbbbb",
    material: opts.material ?? defaultMaterial(kind, opts.name),
    locked: opts.locked,
    floor: opts.floor,
  };
}

export function detectCategory(prompt: string): SceneCategory {
  const p = prompt.toLowerCase();
  // Tolerant of common misspellings ("coffe", "ofice", "scool", "resturant").
  if (/(city|cities|street|road|downtown|urban|town)/.test(p)) return "city";
  if (/(sc?hoo?l|campus|class ?room|playground|universit|college)/.test(p)) return "school";
  if (/(of+ice|workspace|meeting|employee|cowork|startup)/.test(p)) return "office";
  if (/(cof+e+|caf[eé]?\b|cafe|resta?u?rant|\bbar\b|bistro|diner|bakery|\bshop|store)/.test(p)) return "cafe";
  if (/(house|home|residen|apartment|flat\b|villa|bedroom|living ?room)/.test(p)) return "house";
  return "generic";
}

export function extractNumber(prompt: string, nouns: string[]): number | null {
  const re = new RegExp(`(\\d{1,3})\\s*(?:\\w+\\s){0,2}(?:${nouns.join("|")})`, "i");
  const m = prompt.match(re);
  return m?.[1] ? parseInt(m[1], 10) : null;
}

function lightingFor(prompt: string, cat: SceneCategory): SceneSpec["lighting"] {
  const p = prompt.toLowerCase();
  if (/warm|cozy|cosy/.test(p)) return "warm";
  if (/bright|daylight|sunny|outdoor/.test(p)) return "daylight";
  if (cat === "city" || cat === "school") return "daylight";
  if (cat === "cafe" || cat === "house") return "warm";
  return "neutral";
}

function room(w: number, d: number, pal: (typeof PALETTE)["warm"], windows: boolean) {
  const objs: SceneObject[] = [
    createObject("floor", [0, -0.05, 0], { scale: [w, 0.1, d], color: pal.floor, name: "Floor", locked: true }),
    createObject("wall", [0, 1.5, -d / 2], { scale: [w, 3, 0.2], color: pal.wall, name: "Back wall" }),
    createObject("wall", [-w / 2, 1.5, 0], { scale: [d, 3, 0.2], rotationY: Math.PI / 2, color: pal.wall, name: "Left wall" }),
    createObject("wall", [w / 2, 1.5, 0], { scale: [d, 3, 0.2], rotationY: Math.PI / 2, color: pal.wall, name: "Right wall" }),
  ];
  if (windows) {
    const n = Math.max(2, Math.floor(w / 3.5));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (w / (n + 1)) * (i + 1);
      objs.push(createObject("window", [x, 1.7, -d / 2 + 0.12], { scale: [2, 1.6, 0.08], color: "#a9d4ff", name: `Window ${i + 1}` }));
    }
  }
  return objs;
}

function grid(count: number, cols: number, spacingX: number, spacingZ: number, origin: [number, number]) {
  const pts: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    pts.push([origin[0] + c * spacingX, origin[1] + r * spacingZ]);
  }
  return pts;
}

function planCafe(prompt: string, pal: (typeof PALETTE)["warm"]) {
  const seats = Math.min(80, extractNumber(prompt, ["people", "seats", "guests", "persons", "customers"]) ?? 20);
  const tables = Math.ceil(seats / 4);
  const cols = Math.min(6, Math.ceil(Math.sqrt(tables * 1.5)));
  const rows = Math.ceil(tables / cols);
  const w = Math.max(10, cols * 2.6 + 2);
  const d = Math.max(9, rows * 2.6 + 5);
  const objs = room(w, d, pal, /window/i.test(prompt) || true);
  objs.push(createObject("counter", [0, 0.55, -d / 2 + 1.4], { color: pal.wood, name: "Service counter", scale: [Math.min(6, w * 0.5), 1.1, 0.8] }));
  objs.push(createObject("shelf", [-w / 2 + 0.9, 1, -d / 2 + 0.45], { color: pal.wood, name: "Menu shelf" }));
  const start: [number, number] = [-(cols - 1) * 1.3, -d / 2 + 3.6];
  grid(tables, cols, 2.6, 2.6, start).forEach(([x, z], i) => {
    objs.push(createObject("table", [x, 0.375, z], { color: pal.wood, name: `Table ${i + 1}` }));
    const offs: [number, number, number][] = [[0.72, 0, -Math.PI / 2], [-0.72, 0, Math.PI / 2], [0, 0.72, Math.PI], [0, -0.72, 0]];
    offs.forEach(([dx, dz, r], j) =>
      objs.push(createObject("chair", [x + dx, 0.45, z + dz], { rotationY: r, color: pal.accent, name: `Chair ${i + 1}.${j + 1}` })),
    );
  });
  objs.push(createObject("plant", [w / 2 - 0.6, 0.6, d / 2 - 0.6], { color: "#3f7d4a", name: "Plant" }));
  objs.push(createObject("plant", [-w / 2 + 0.6, 0.6, d / 2 - 0.6], { color: "#3f7d4a", name: "Plant" }));
  if (/detail|restaurant|resturant|bistro|diner/i.test(prompt)) {
    for (const table of objs.filter((part) => part.kind === "table")) {
      objs.push(createObject("plant", [table.position[0], 0.875, table.position[2]], { scale: [0.18, 0.25, 0.18], color: "#c6d0bc", name: `${table.name} centrepiece` }));
    }
    objs.push(createObject("sofa", [-w / 2 + 0.75, 0.4, d / 2 - 2], { rotationY: Math.PI / 2, color: "#b9b7ae", name: "Waiting lounge", scale: [2, 0.8, 0.9] }));
    objs.push(createObject("desk", [-w / 2 + 1.1, 0.375, -d / 2 + 1.4], { name: "Service preparation desk", color: "#d3c6b4" }));
    objs.push(createObject("box", [w / 2 - 1.1, 0.675, -d / 2 + 1.2], { name: "Coffee station", scale: [1.2, 1.35, 0.65], color: "#d9d9d9" }));
    for (const x of [-1.1, 0, 1.1]) objs.push(createObject("chair", [x, 0.4, -d / 2 + 2.25], {
      name: "Bar stool", scale: [0.45, 0.8, 0.45], color: "#bbbbbb",
    }));
    objs.push(createObject("wall", [0, 3.08, 0], { name: "Ceiling", scale: [w, 0.16, d], color: "#e9e2d6", locked: true }));
  }
  return { objs, w, d, assumptions: [`Seating for ${tables * 4} (requested ${seats}) at 4-person tables`] };
}

function planOffice(prompt: string, pal: (typeof PALETTE)["warm"]) {
  const staff = Math.min(60, extractNumber(prompt, ["employees", "people", "staff", "desks", "workers"]) ?? 12);
  const cols = Math.min(6, Math.ceil(Math.sqrt(staff)));
  const rows = Math.ceil(staff / cols);
  const w = Math.max(12, cols * 2 + 8);
  const d = Math.max(10, rows * 2 + 4);
  const objs = room(w, d, pal, true);
  grid(staff, cols, 2, 2, [-w / 2 + 2, -d / 2 + 2.5]).forEach(([x, z], i) => {
    objs.push(createObject("desk", [x, 0.375, z], { color: "#d9d9d9", name: `Desk ${i + 1}` }));
    objs.push(createObject("chair", [x, 0.45, z + 0.6], { rotationY: Math.PI, color: "#2b2b2b", name: `Chair ${i + 1}` }));
  });
  const rooms = /meeting/i.test(prompt) ? 2 : 1;
  for (let i = 0; i < rooms; i++) {
    const z = -d / 2 + 2.5 + i * 4;
    objs.push(createObject("table", [w / 2 - 3, 0.375, z], { scale: [2.4, 0.75, 1.2], color: pal.wood, name: `Meeting table ${i + 1}` }));
    objs.push(createObject("wall", [w / 2 - 5.5, 1.5, z], { scale: [3.5, 3, 0.1], rotationY: Math.PI / 2, color: "#cfe3ff", name: `Glass partition ${i + 1}` }));
  }
  objs.push(createObject("sofa", [w / 2 - 3, 0.4, d / 2 - 1.2], { color: pal.accent, name: "Lounge sofa" }));
  return { objs, w, d, assumptions: [`${staff} workstations`, `${rooms} meeting area(s)`] };
}

function planSchool(prompt: string, pal: (typeof PALETTE)["warm"]) {
  const classes = Math.min(8, extractNumber(prompt, ["classrooms", "classes", "rooms"]) ?? 4);
  const objs: SceneObject[] = [
    createObject("floor", [0, -0.05, 0], { scale: [50, 0.1, 40], color: "#6f8f5a", name: "Campus ground", locked: true }),
  ];
  for (let i = 0; i < classes; i++) {
    const x = -20 + (i % 4) * 9;
    const z = i < 4 ? -14 : 14;
    objs.push(createObject("building", [x, 2, z], { scale: [7, 4, 6], color: "#d8b48a", name: `Classroom ${i + 1}` }));
  }
  objs.push(createObject("building", [16, 3, 0], { scale: [8, 6, 10], color: "#c9cfd6", name: "Reception" }));
  objs.push(createObject("floor", [-4, 0.01, 0], { scale: [14, 0.05, 10], color: "#bfb6a5", name: "Courtyard" }));
  objs.push(createObject("slide", [-18, 1, 2], { color: "#e2533b", name: "Playground slide" }));
  objs.push(createObject("box", [-14, 0.3, 4], { scale: [3, 0.6, 3], color: "#e0a23b", name: "Sandpit" }));
  for (let i = 0; i < 6; i++) objs.push(createObject("tree", [-10 + i * 4, 2, 8], { color: "#3f7d4a", name: `Tree ${i + 1}` }));
  for (let i = 0; i < 3; i++) objs.push(createObject("bench", [-8 + i * 4, 0.25, -3], { color: pal.wood, name: `Bench ${i + 1}` }));
  return { objs, w: 50, d: 40, assumptions: [`${classes} classroom blocks`, "Central courtyard and playground"] };
}

const STOREY_H = 2.7;

/** Detailed two-storey duplex: real rooms, staircase, furniture on both floors. */
/** Duplex stairwell opening (metres): width from the left wall and its back/front edges on the z axis. */
const STAIRWELL_W = 1.25, STAIRWELL_BACK = 0.46, STAIRWELL_FRONT = 3.6;
function planDuplex(pal: (typeof PALETTE)["warm"]) {
  const W = 12, D = 10; // interior footprint in metres
  const objs: SceneObject[] = [
    createObject("floor", [0, -0.05, 0], { scale: [22, 0.1, 20], color: "#6f8f5a", name: "Lot", locked: true, floor: 0 }),
  ];
  const shell = (f: number) => {
    const y = f * STOREY_H;
    if (!f) objs.push(createObject("floor", [0, y + 0.05, 0], { scale: [W, 0.12, D], color: pal.floor, name: "Ground-floor slab", locked: true, floor: f }));
    else {
      // Upper slab leaves a real stairwell opening over the staircase so people can walk up through it.
      const ox = -W / 2 + STAIRWELL_W, back = STAIRWELL_BACK, front = STAIRWELL_FRONT;
      objs.push(createObject("floor", [(ox + W / 2) / 2, y + 0.05, 0], { scale: [W / 2 - ox, 0.12, D], color: pal.floor, name: "First-floor slab", locked: true, floor: f }));
      objs.push(createObject("floor", [(-W / 2 + ox) / 2, y + 0.05, (-D / 2 + back) / 2], { scale: [STAIRWELL_W, 0.12, back + D / 2], color: pal.floor, name: "First-floor landing", locked: true, floor: f }));
      objs.push(createObject("floor", [(-W / 2 + ox) / 2, y + 0.05, (front + D / 2) / 2], { scale: [STAIRWELL_W, 0.12, D / 2 - front], color: pal.floor, name: "First-floor slab edge", locked: true, floor: f }));
    }
    objs.push(createObject("wall", [0, y + STOREY_H / 2, -D / 2], { scale: [W, STOREY_H, 0.2], color: pal.wall, name: `Back wall F${f}`, floor: f }));
    objs.push(createObject("wall", [-W / 2, y + STOREY_H / 2, 0], { scale: [D, STOREY_H, 0.2], rotationY: Math.PI / 2, color: pal.wall, name: `Left wall F${f}`, floor: f }));
    objs.push(createObject("wall", [W / 2, y + STOREY_H / 2, 0], { scale: [D, STOREY_H, 0.2], rotationY: Math.PI / 2, color: pal.wall, name: `Right wall F${f}`, floor: f }));
    // Front wall split around the entrance / glazing
    objs.push(createObject("wall", [-W / 2 + 1.5, y + STOREY_H / 2, D / 2], { scale: [3, STOREY_H, 0.2], color: pal.wall, name: `Front wall A F${f}`, floor: f }));
    objs.push(createObject("wall", [W / 2 - 1.5, y + STOREY_H / 2, D / 2], { scale: [3, STOREY_H, 0.2], color: pal.wall, name: `Front wall B F${f}`, floor: f }));
    objs.push(createObject("wall", [0, y + STOREY_H - 0.3, D / 2], { scale: [W - 6, 0.6, 0.2], color: pal.wall, name: `Front lintel F${f}`, floor: f }));
    // Windows on back and side walls
    for (const x of [-3.5, 0, 3.5]) objs.push(createObject("window", [x, y + 1.6, -D / 2 + 0.12], { scale: [1.8, 1.4, 0.08], color: "#a9d4ff", name: `Back window F${f}`, floor: f }));
    objs.push(createObject("window", [-W / 2 + 0.12, y + 1.6, 0], { scale: [1.8, 1.4, 0.08], rotationY: Math.PI / 2, color: "#a9d4ff", name: `Side window F${f}`, floor: f }));
    objs.push(createObject("window", [W / 2 - 0.12, y + 1.6, 0], { scale: [1.8, 1.4, 0.08], rotationY: Math.PI / 2, color: "#a9d4ff", name: `Side window F${f}`, floor: f }));
    objs.push(createObject("lamp", [0, y + STOREY_H - 0.25, f ? 2.5 : 0], { scale: [0.3, 0.5, 0.3], color: "#ffe9c4", name: `Ceiling light F${f}`, floor: f }));
  };
  shell(0);
  shell(1);
  // Roof plate + parapet
  objs.push(createObject("floor", [0, 2 * STOREY_H + 0.05, 0], { scale: [W + 0.4, 0.15, D + 0.4], color: "#c9c2b6", name: "Roof slab", locked: true, floor: 2 }));
  for (const [x, z, w, d] of [[0, -D / 2 - 0.1, W + 0.4, 0.2], [0, D / 2 + 0.1, W + 0.4, 0.2], [-W / 2 - 0.1, 0, 0.2, D], [W / 2 + 0.1, 0, 0.2, D]] as const)
    objs.push(createObject("wall", [x, 2 * STOREY_H + 0.4, z], { scale: [w, 0.6, d], color: pal.wall, name: "Roof parapet", floor: 2 }));
  // Staircase along the left wall: 12 rises of 0.225 m
  const steps = 12, rise = STOREY_H / steps, run = 0.28;
  for (let i = 0; i < steps; i++)
    objs.push(createObject("box", [-W / 2 + 0.6, (i + 0.5) * rise, D / 2 - 1.6 - i * run], { scale: [1.0, rise, run], color: pal.wood, name: `Stair ${i + 1}`, floor: i < steps / 2 ? 0 : 1 }));
  objs.push(createObject("box", [-W / 2 + 1.2, STOREY_H / 2, D / 2 - 3.2], { scale: [0.06, STOREY_H, 3.6], color: "#3a3a3a", name: "Stair railing", floor: 0 }));
  // Ground floor: living room + kitchen + bathroom
  objs.push(createObject("wall", [1.5, STOREY_H / 2, 0.5], { scale: [D / 2 - 1, STOREY_H, 0.12], rotationY: Math.PI / 2, color: pal.wall, name: "Living partition", floor: 0 }));
  objs.push(createObject("sofa", [-2.5, 0.4, -2.5], { color: pal.accent, name: "Living sofa", floor: 0 }));
  objs.push(createObject("sofa", [-4.2, 0.4, -0.8], { rotationY: Math.PI / 2, color: pal.accent, name: "Living sofa 2", floor: 0 }));
  objs.push(createObject("table", [-2.6, 0.2, -1.1], { scale: [1.1, 0.4, 0.6], color: pal.wood, name: "Coffee table", floor: 0 }));
  objs.push(createObject("shelf", [-2.5, 1, -D / 2 + 0.35], { color: pal.wood, name: "TV shelf", floor: 0 }));
  objs.push(createObject("lamp", [-5.2, 1.6, -4.2], { scale: [0.3, 1.6, 0.3], color: "#ffe9c4", name: "Floor lamp", floor: 0 }));
  objs.push(createObject("plant", [0.6, 0.6, -4.3], { color: "#3f7d4a", name: "Living plant", floor: 0 }));
  objs.push(createObject("counter", [4, 0.55, -D / 2 + 0.6], { scale: [3.6, 1.1, 0.8], color: pal.wood, name: "Kitchen counter", floor: 0 }));
  objs.push(createObject("box", [5.2, 0.9, -D / 2 + 1.8], { scale: [0.7, 1.8, 0.7], color: "#d9d9d9", name: "Fridge", floor: 0 }));
  objs.push(createObject("table", [3.6, 0.375, 1.6], { scale: [1.6, 0.75, 0.9], color: pal.wood, name: "Dining table", floor: 0 }));
  for (const [dx, dz, r] of [[-1.05, 0, -Math.PI / 2], [1.05, 0, Math.PI / 2], [-0.35, 0.85, Math.PI], [0.35, 0.85, Math.PI]] as const)
    objs.push(createObject("chair", [3.6 + dx, 0.45, 1.6 + dz], { rotationY: r, color: pal.accent, name: "Dining chair", floor: 0 }));
  objs.push(createObject("wall", [3.5, STOREY_H / 2, 3.4], { scale: [5, STOREY_H, 0.12], color: pal.wall, name: "Bathroom wall", floor: 0 }));
  objs.push(createObject("box", [1.6, 0.45, 4.2], { scale: [1.6, 0.9, 0.8], color: "#e8ecef", name: "Bath", floor: 0 }));
  objs.push(createObject("box", [0.4, 0.4, 4.4], { scale: [0.45, 0.8, 0.6], color: "#e8ecef", name: "WC", floor: 0 }));
  objs.push(createObject("box", [2.75, 0.45, 4.35], { scale: [0.5, 0.9, 0.45], color: "#e8ecef", name: "Basin", floor: 0 }));
  // First floor: 3 bedrooms + bathroom
  const y1 = STOREY_H;
  // Corridor wall stops at the stairwell so the top of the stairs opens onto the landing.
  objs.push(createObject("wall", [STAIRWELL_W / 2, y1 + STOREY_H / 2, 0.8], { scale: [W - STAIRWELL_W, STOREY_H, 0.12], color: pal.wall, name: "Bedroom corridor wall", floor: 1 }));
  objs.push(createObject("wall", [0, y1 + STOREY_H / 2, -1.8], { scale: [D / 2 - 1.4, STOREY_H, 0.12], rotationY: Math.PI / 2, color: pal.wall, name: "Bedroom partition", floor: 1 }));
  const bedroom = (cx: number, cz: number, label: string) => {
    objs.push(createObject("box", [cx, y1 + 0.3, cz], { scale: [1.6, 0.6, 2.1], color: "#c9b8a6", name: `${label} bed`, floor: 1 }));
    objs.push(createObject("box", [cx, y1 + 0.72, cz - 0.7], { scale: [1.5, 0.18, 0.6], color: "#f0ebe2", name: `${label} pillows`, floor: 1 }));
    objs.push(createObject("shelf", [cx + 1.6, y1 + 1, cz - 1], { scale: [1.2, 2, 0.5], color: pal.wood, name: `${label} wardrobe`, floor: 1 }));
    objs.push(createObject("box", [cx - 1.3, y1 + 0.4, cz - 0.9], { scale: [0.8, 0.8, 0.5], color: pal.wood, name: `${label} drawers`, floor: 1 }));
    objs.push(createObject("lamp", [cx - 1.3, y1 + 1.0, cz - 0.9], { scale: [0.2, 0.35, 0.2], color: "#ffe9c4", name: `${label} bedside lamp`, floor: 1 }));
  };
  bedroom(-3.4, -3, "Main bedroom");
  bedroom(3.4, -3, "Bedroom 2");
  bedroom(-3.4, 2.8, "Bedroom 3");
  objs.push(createObject("box", [4.2, y1 + 0.45, 3.4], { scale: [1.6, 0.9, 0.8], color: "#e8ecef", name: "Upstairs bath", floor: 1 }));
  objs.push(createObject("box", [2.9, y1 + 0.4, 3.9], { scale: [0.45, 0.8, 0.6], color: "#e8ecef", name: "Upstairs WC", floor: 1 }));
  objs.push(createObject("desk", [3.4, y1 + 0.375, 1.6], { color: "#d9d9d9", name: "Study desk", floor: 1 }));
  objs.push(createObject("chair", [3.4, y1 + 0.45, 2.3], { rotationY: Math.PI, color: "#2b2b2b", name: "Study chair", floor: 1 }));
  // Garden
  objs.push(createObject("floor", [0, 0.01, 8.5], { scale: [14, 0.05, 5], color: "#4f8a42", name: "Garden", floor: 0 }));
  objs.push(createObject("tree", [-6, 2, 9.5], { color: "#3f7d4a", name: "Tree 1", floor: 0 }));
  objs.push(createObject("floor", [8, 0.01, 4], { scale: [5, 0.05, 7], color: "#555b61", name: "Parking", floor: 0 }));
  objs.push(createObject("car", [8, 0.7, 4], { color: pal.accent, name: "Car", floor: 0 }));
  return { objs, w: 22, d: 20, assumptions: ["Two-storey duplex with 2.7 m floor-to-ceiling storeys", "3 bedrooms, 2 bathrooms, living room, kitchen and staircase", "Use the floor selector to focus or cut away upper floors"] };
}

function planHouse(prompt: string, pal: (typeof PALETTE)["warm"]) {
  if (/two|2[- ]stor|duplex/i.test(prompt)) return planDuplex(pal);
  const objs: SceneObject[] = [
    createObject("floor", [0, -0.05, 0], { scale: [30, 0.1, 30], color: "#6f8f5a", name: "Lot", locked: true, floor: 0 }),
  ];
  objs.push(createObject("building", [0, 1.5, -2], { scale: [10, 3, 8], color: "#e4dccf", name: "Storey 1", floor: 0 }));
  objs.push(createObject("window", [-2.5, 1.6, 2.05], { scale: [2, 1.4, 0.08], color: "#a9d4ff", name: "Front window", floor: 0 }));
  objs.push(createObject("window", [2.5, 1.6, 2.05], { scale: [2, 1.4, 0.08], color: "#a9d4ff", name: "Front window", floor: 0 }));
  objs.push(createObject("floor", [-8, 0.01, 8], { scale: [10, 0.05, 8], color: "#4f8a42", name: "Garden", floor: 0 }));
  for (let i = 0; i < 4; i++) objs.push(createObject("tree", [-11 + i * 2.2, 2, 10], { color: "#3f7d4a", name: `Tree ${i + 1}`, floor: 0 }));
  objs.push(createObject("floor", [8, 0.01, 8], { scale: [6, 0.05, 8], color: "#555b61", name: "Parking", floor: 0 }));
  objs.push(createObject("car", [8, 0.7, 8], { color: pal.accent, name: "Car", floor: 0 }));
  return { objs, w: 30, d: 30, assumptions: ["Single-storey residence", "Garden and parking pad included by default"] };
}

function planCity(prompt: string) {
  const blocks = Math.min(16, extractNumber(prompt, ["buildings", "blocks", "towers"]) ?? 9);
  const objs: SceneObject[] = [
    createObject("floor", [0, -0.05, 0], { scale: [70, 0.1, 70], color: "#5d6b55", name: "Ground", locked: true }),
    createObject("road", [0, 0.01, 0], { scale: [70, 0.05, 6], color: "#2e3236", name: "Main avenue" }),
    createObject("road", [0, 0.012, 0], { scale: [6, 0.05, 70], color: "#2e3236", name: "Cross street" }),
  ];
  const slots: [number, number][] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++)
    slots.push([sx * (9 + a * 12), sz * (9 + b * 12)]);
  const futuristic = /futur|sci|neon/i.test(prompt);
  for (let i = 0; i < blocks; i++) {
    const slot = slots[i % slots.length];
    if (!slot) continue;
    const [x, z] = slot;
    const h = 6 + ((i * 37) % 22);
    objs.push(createObject("building", [x, h / 2, z], { scale: [8, h, 8], color: futuristic ? "#9fb7c9" : "#b9b1a6", name: `Building ${i + 1}` }));
  }
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    objs.push(createObject("lamp", [i * 9, 1.6, 3.6], { color: "#e8e3d0", name: "Street light" }));
    objs.push(createObject("tree", [i * 9, 2, -3.8], { color: "#3f7d4a", name: "Street tree" }));
  }
  objs.push(createObject("car", [-12, 0.7, -1.5], { rotationY: Math.PI / 2, color: "#e2533b", name: "Car" }));
  objs.push(createObject("car", [10, 0.7, 1.5], { rotationY: -Math.PI / 2, color: "#2f6fdf", name: "Car" }));
  return { objs, w: 70, d: 70, assumptions: [`${blocks} buildings around a crossroads`] };
}

function planGeneric(prompt: string, pal: (typeof PALETTE)["warm"]) {
  const objs = room(12, 10, pal, true);
  objs.push(createObject("table", [0, 0.375, 0], { scale: [3, 0.75, 1.2], color: pal.wood, name: "Central table" }));
  objs.push(createObject("shelf", [-5, 1, -4.4], { color: pal.wood, name: "Shelf" }));
  objs.push(createObject("sofa", [0, 0.4, 3], { rotationY: Math.PI, color: pal.accent, name: "Sofa" }));
  objs.push(createObject("plant", [5, 0.6, 4], { color: "#3f7d4a", name: "Plant" }));
  return { objs, w: 12, d: 10, assumptions: ["Prompt did not match a known category; created a general-purpose room"] };
}

export function planScene(prompt: string): SceneSpec {
  const clean = prompt.trim().slice(0, 1000) || "A simple room";
  const category = detectCategory(clean);
  const lighting = lightingFor(clean, category);
  const pal = PALETTE[lighting];
  const r =
    category === "cafe" ? planCafe(clean, pal)
    : category === "office" ? planOffice(clean, pal)
    : category === "school" ? planSchool(clean, pal)
    : category === "house" ? planHouse(clean, pal)
    : category === "city" ? planCity(clean)
    : planGeneric(clean, pal);
  return {
    version: SCENE_SCHEMA_VERSION,
    id: makeId("scene"),
    title: clean.length > 48 ? clean.slice(0, 45) + "…" : clean,
    prompt: clean,
    category,
    size: { width: r.w, depth: r.d },
    lighting,
    objects: r.objs,
    generator: "local-rule-planner",
    assumptions: r.assumptions,
  };
}

export function isValidScene(x: unknown): x is SceneSpec {
  if (!x || typeof x !== "object") return false;
  const s = x as SceneSpec;
  if(s.tabletop&&(![s.tabletop.width,s.tabletop.depth,s.tabletop.relativeYaw,s.tabletop.zoom].every(Number.isFinite)||s.tabletop.width<=0||s.tabletop.depth<=0||s.tabletop.zoom<0.5||s.tabletop.zoom>2))return false;
  if (s.alignment !== undefined && (!Array.isArray(s.alignment) || !s.alignment.every(a => a && typeof a.objectId === "string" && typeof a.surfaceId === "string" && ["floor","table","wall","ceiling","unknown"].includes(a.surfaceKind) && Array.isArray(a.offset) && a.offset.length === 3 && a.offset.every(Number.isFinite) && Number.isFinite(a.yaw)))) return false;
  return (
    s.version === SCENE_SCHEMA_VERSION &&
    Array.isArray(s.objects) &&
    s.objects.every(
      (o) => typeof o.id === "string" && Array.isArray(o.position) && o.position.length === 3 && Array.isArray(o.scale) && o.scale.length === 3,
    )
  );
}

export function blankScene(): SceneSpec {
  return {
    version: SCENE_SCHEMA_VERSION,
    id: makeId("scene"),
    title: "Untitled scene",
    prompt: "",
    category: "generic",
    size: { width: 12, depth: 12 },
    lighting: "neutral",
    objects: [createObject("floor", [0, -0.05, 0], { scale: [12, 0.1, 12], color: "#8d939a", name: "Floor", locked: false })],
    generator: "local-rule-planner",
    assumptions: ["Editable starting floor; dimensions can change through reviewed proposals."],
  };
}
