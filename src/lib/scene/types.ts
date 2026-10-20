export const SCENE_SCHEMA_VERSION = 1;

export type ObjectKind =
  | "floor"
  | "wall"
  | "window"
  | "table"
  | "chair"
  | "counter"
  | "desk"
  | "sofa"
  | "shelf"
  | "plant"
  | "lamp"
  | "tree"
  | "building"
  | "road"
  | "bench"
  | "car"
  | "slide"
  | "box";

export type Vec3 = [number, number, number];

export interface SceneObject {
  id: string;
  kind: ObjectKind;
  name: string;
  position: Vec3;
  rotationY: number; // radians
  scale: Vec3; // dimensions in metres (w, h, d)
  color: string;
  material?: import("./materials").MaterialFinish | undefined;
  locked?: boolean | undefined;
  /** Storey index (0 = ground) for multi-floor navigation and cutaway views. */
  floor?: number | undefined;
}

export type SceneCategory =
  | "cafe"
  | "office"
  | "school"
  | "house"
  | "city"
  | "generic";

export interface SceneSpec {
  tabletop?:{surfaceKind:"table"|"floor";width:number;depth:number;relativeYaw:number;zoom:number}|undefined;
  /** Relative alignment is portable design metadata, never an XR persistent handle. */
  alignment?: import("../spatial-provider").RelativeAnchor[] | undefined;
  reference?: import("./reference").RoomReference | undefined;
  version: number;
  id: string;
  title: string;
  prompt: string;
  category: SceneCategory;
  size: { width: number; depth: number };
  lighting: "warm" | "neutral" | "daylight";
  objects: SceneObject[];
  /** How the scene was produced — never claim AI when it was the local planner. */
  generator: "local-rule-planner" | "live-ai";
  assumptions: string[];
}
