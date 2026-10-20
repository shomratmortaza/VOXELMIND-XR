import { blankScene, createObject } from "./planner";

/** Explicitly selected, curated demo — never a replacement for the user's prompt. */
export function startingSpace() {
  const scene = blankScene();
  scene.title = "Design lounge";
  scene.category = "house";
  scene.lighting = "warm";
  scene.size = { width: 8, depth: 8 };
  scene.assumptions = ["Curated starting space. Furniture dimensions are design defaults, not measured products."];
  scene.objects = [
    createObject("floor", [0, -0.05, 0], { name: "Oak floor", scale: [8, 0.1, 8], material: "floor", color: "#b6a28b", locked: true }),
    createObject("wall", [0, 1.5, -4], { name: "Gallery wall", scale: [8, 3, 0.16], material: "plaster", color: "#e4e4dd", locked: true }),
    createObject("wall", [-4, 1.5, 0], { name: "Side wall", scale: [0.16, 3, 8], material: "plaster", color: "#e4e4dd", locked: true }),
    createObject("sofa", [0, 0.45, -2.5], { name: "Lounge sofa", scale: [2.4, 0.9, 1], material: "original", color: "#ffffff" }),
    createObject("table", [0, 0.375, -0.7], { name: "Conversation table", scale: [1.4, 0.75, 0.8], material: "wood", color: "#b6a28b" }),
    createObject("chair", [-2, 0.45, -0.4], { name: "Lounge chair", rotationY: Math.PI / 2, scale: [0.6, 0.9, 0.6], material: "original", color: "#ffffff" }),
    createObject("chair", [2, 0.45, -0.4], { name: "Lounge chair", rotationY: -Math.PI / 2, scale: [0.6, 0.9, 0.6], material: "original", color: "#ffffff" }),
    createObject("shelf", [-2.8, 1, -3.3], { name: "Open bookcase", scale: [1.2, 2, 0.4], material: "original", color: "#ffffff" }),
    createObject("plant", [2.8, 0.6, -3], { name: "Indoor plant", scale: [0.65, 1.2, 0.65], material: "original", color: "#ffffff" }),
  ];
  return scene;
}