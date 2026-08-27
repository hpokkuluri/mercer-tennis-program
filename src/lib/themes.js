// Full app themes: each one swaps background, card, border, text, accent,
// and (for the dark theme) the status colors too — not just the accent —
// so picking one actually changes the screen, not just button colors.
// Purely a personal display preference, so it lives in this device's
// localStorage rather than syncing anywhere.

export const THEMES = [
  {
    id: "lime",
    name: "Tennis Green",
    swatch: "oklch(75% 0.19 125)",
    dark: false,
    tokens: {
      "--bg": "oklch(97% 0.006 95)",
      "--card": "oklch(100% 0 0)",
      "--border": "oklch(91% 0.008 90)",
      "--border-soft": "oklch(94% 0.006 90)",
      "--text": "oklch(20% 0.01 260)",
      "--text-muted": "oklch(50% 0.01 260)",
      "--text-faint": "oklch(62% 0.01 260)",
      "--accent": "oklch(75% 0.19 125)",
      "--accent-text": "oklch(22% 0.05 125)",
      "--accent-soft-bg": "oklch(95% 0.03 140)",
    },
  },
  {
    id: "ocean",
    name: "Ocean Blue",
    swatch: "oklch(70% 0.15 235)",
    dark: false,
    tokens: {
      "--bg": "oklch(97% 0.012 235)",
      "--card": "oklch(100% 0 0)",
      "--border": "oklch(90% 0.02 235)",
      "--border-soft": "oklch(94% 0.014 235)",
      "--text": "oklch(20% 0.02 250)",
      "--text-muted": "oklch(50% 0.02 250)",
      "--text-faint": "oklch(62% 0.02 250)",
      "--accent": "oklch(70% 0.15 235)",
      "--accent-text": "oklch(20% 0.05 235)",
      "--accent-soft-bg": "oklch(94% 0.03 235)",
    },
  },
  {
    id: "sunset",
    name: "Sunset Orange",
    swatch: "oklch(74% 0.16 55)",
    dark: false,
    tokens: {
      "--bg": "oklch(97% 0.015 55)",
      "--card": "oklch(100% 0 0)",
      "--border": "oklch(90% 0.025 55)",
      "--border-soft": "oklch(94% 0.018 55)",
      "--text": "oklch(20% 0.015 40)",
      "--text-muted": "oklch(50% 0.015 40)",
      "--text-faint": "oklch(62% 0.015 40)",
      "--accent": "oklch(74% 0.16 55)",
      "--accent-text": "oklch(24% 0.05 55)",
      "--accent-soft-bg": "oklch(95% 0.04 55)",
    },
  },
  {
    id: "berry",
    name: "Berry",
    swatch: "oklch(68% 0.16 345)",
    dark: false,
    tokens: {
      "--bg": "oklch(97% 0.012 345)",
      "--card": "oklch(100% 0 0)",
      "--border": "oklch(90% 0.02 345)",
      "--border-soft": "oklch(94% 0.014 345)",
      "--text": "oklch(20% 0.015 340)",
      "--text-muted": "oklch(50% 0.015 340)",
      "--text-faint": "oklch(62% 0.015 340)",
      "--accent": "oklch(68% 0.16 345)",
      "--accent-text": "oklch(97% 0.01 345)",
      "--accent-soft-bg": "oklch(95% 0.03 345)",
    },
  },
  {
    id: "slate",
    name: "Slate (Dark)",
    swatch: "oklch(45% 0.02 260)",
    dark: true,
    tokens: {
      "--bg": "oklch(20% 0.008 260)",
      "--card": "oklch(26% 0.008 260)",
      "--border": "oklch(35% 0.008 260)",
      "--border-soft": "oklch(31% 0.008 260)",
      "--text": "oklch(95% 0.004 260)",
      "--text-muted": "oklch(74% 0.006 260)",
      "--text-faint": "oklch(58% 0.006 260)",
      "--accent": "oklch(80% 0.16 125)",
      "--accent-text": "oklch(18% 0.04 125)",
      "--accent-soft-bg": "oklch(34% 0.03 140)",
      "--green-bg": "oklch(30% 0.06 140)",
      "--green-text": "oklch(80% 0.1 140)",
      "--green-solid": "oklch(65% 0.14 140)",
      "--amber-bg": "oklch(32% 0.06 70)",
      "--amber-text": "oklch(82% 0.09 70)",
      "--amber-solid": "oklch(70% 0.13 70)",
      "--red-bg": "oklch(32% 0.06 25)",
      "--red-text": "oklch(80% 0.1 25)",
      "--red-solid": "oklch(65% 0.16 25)",
      "--blue": "oklch(75% 0.1 220)",
    },
  },
];

// Every key any theme might set — cleared before applying a new theme so a
// previous theme's overrides (e.g. Slate's dark status colors) don't stick
// around on top of a lighter theme that doesn't mention them.
const ALL_KEYS = [
  "--bg", "--card", "--border", "--border-soft", "--text", "--text-muted", "--text-faint",
  "--accent", "--accent-text", "--accent-soft-bg",
  "--green-bg", "--green-text", "--green-solid",
  "--amber-bg", "--amber-text", "--amber-solid",
  "--red-bg", "--red-text", "--red-solid",
  "--blue",
];

const KEY = "rallypoint.theme";

export function getStoredThemeId() {
  try {
    return localStorage.getItem(KEY) || THEMES[0].id;
  } catch {
    return THEMES[0].id;
  }
}

export function applyTheme(id) {
  const t = THEMES.find((x) => x.id === id) || THEMES[0];
  const root = document.documentElement;
  ALL_KEYS.forEach((k) => root.style.removeProperty(k));
  Object.entries(t.tokens).forEach(([k, v]) => root.style.setProperty(k, v));
  try {
    localStorage.setItem(KEY, t.id);
  } catch {
    // best effort — a private/blocked storage context just won't persist the pick
  }
  return t.id;
}
