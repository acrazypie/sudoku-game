// platform.js — tells the game whether it runs in a normal browser or inside
// the iOS / Android app (Capacitor). In a browser: isNative = false,
// platform = "web", and nothing else changes.

const cap = window.Capacitor;

export const isNative = !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());

/** "ios" | "android" | "web" */
export const platform = isNative ? cap.getPlatform() : "web";

document.documentElement.dataset.platform = platform;
