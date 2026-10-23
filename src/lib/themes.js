// Full app themes: each one swaps not just colors but the shape language
// (corner radius, border weight, shadows) and typography (display + body
// fonts) and the page background — so picking one actually changes the
// screen's whole personality, not just an accent color.
// Purely a personal display preference, so it lives in this device's
// localStorage rather than syncing anywhere.

export const THEMES = [
  {
    id: "lime",
    name: "Classic",
    blurb: "The original — clean, bright, friendly.",
    swatch: "oklch(75% 0.19 125)",
    dark: false,
    tokens: {
      "--bg": "oklch(97% 0.006 95)",
      "--card": "oklch(100% 0 0)",
      "--border": "oklch(91% 0.008 90)",
      "--border-soft": "oklch(94% 0.006 90)",
      "--border-width": "1px",
      "--text": "oklch(20% 0.01 260)",
      "--text-muted": "oklch(50% 0.01 260)",
      "--text-faint": "oklch(62% 0.01 260)",
      "--accent": "oklch(75% 0.19 125)",
      "--accent-text": "oklch(22% 0.05 125)",
      "--accent-soft-bg": "oklch(95% 0.03 140)",
      "--radius-sm": "9px",
      "--radius-md": "13px",
      "--radius-lg": "16px",
      "--font-display": '"Space Grotesk", sans-serif',
      "--font-body": '"Manrope", sans-serif',
      "--shadow-card": "0 1px 2px oklch(20% 0.02 260 / 0.05)",
      "--shadow-btn": "0 4px 14px color-mix(in oklch, var(--accent) 35%, transparent)",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    blurb: "A calm, focused dark mode.",
    swatch: "oklch(45% 0.02 260)",
    dark: true,
    tokens: {
      "--bg": "oklch(20% 0.008 260)",
      "--card": "oklch(26% 0.008 260)",
      "--border": "oklch(35% 0.008 260)",
      "--border-soft": "oklch(31% 0.008 260)",
      "--border-width": "1px",
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
      "--radius-sm": "9px",
      "--radius-md": "13px",
      "--radius-lg": "16px",
      "--font-display": '"Space Grotesk", sans-serif',
      "--font-body": '"Manrope", sans-serif',
      "--shadow-card": "0 1px 3px oklch(0% 0 0 / 0.3)",
      "--shadow-btn": "0 4px 14px color-mix(in oklch, var(--accent) 30%, transparent)",
    },
  },
  {
    id: "tech",
    name: "Tech",
    blurb: "Dark, sharp, monospace — terminal energy.",
    swatch: "oklch(80% 0.18 165)",
    dark: true,
    tokens: {
      "--bg": "linear-gradient(180deg, oklch(15% 0.012 240), oklch(12% 0.014 250))",
      "--card": "oklch(18% 0.014 240)",
      "--border": "oklch(38% 0.05 170)",
      "--border-soft": "oklch(28% 0.02 240)",
      "--border-width": "1px",
      "--text": "oklch(94% 0.01 170)",
      "--text-muted": "oklch(72% 0.02 180)",
      "--text-faint": "oklch(52% 0.02 200)",
      "--accent": "oklch(80% 0.18 165)",
      "--accent-text": "oklch(14% 0.03 165)",
      "--accent-soft-bg": "oklch(28% 0.06 165)",
      "--green-bg": "oklch(26% 0.07 150)",
      "--green-text": "oklch(82% 0.14 150)",
      "--green-solid": "oklch(72% 0.16 150)",
      "--amber-bg": "oklch(28% 0.07 80)",
      "--amber-text": "oklch(82% 0.12 80)",
      "--amber-solid": "oklch(75% 0.15 80)",
      "--red-bg": "oklch(28% 0.08 20)",
      "--red-text": "oklch(80% 0.14 20)",
      "--red-solid": "oklch(68% 0.18 20)",
      "--blue": "oklch(78% 0.12 220)",
      "--radius-sm": "4px",
      "--radius-md": "6px",
      "--radius-lg": "9px",
      "--font-display": '"IBM Plex Mono", monospace',
      "--font-body": '"IBM Plex Sans", sans-serif',
      "--shadow-card": "0 0 0 1px oklch(38% 0.05 170 / 0.3), 0 2px 10px oklch(0% 0 0 / 0.4)",
      "--shadow-btn": "0 0 16px color-mix(in oklch, var(--accent) 55%, transparent)",
    },
  },
  {
    id: "retro",
    name: "Retro Synthwave",
    blurb: "80s neon grid — hot pink and electric cyan.",
    swatch: "oklch(72% 0.24 340)",
    dark: true,
    tokens: {
      "--bg": "linear-gradient(160deg, oklch(24% 0.09 310), oklch(16% 0.08 265))",
      "--card": "oklch(26% 0.07 305)",
      "--border": "oklch(55% 0.15 320)",
      "--border-soft": "oklch(38% 0.09 305)",
      "--border-width": "1.5px",
      "--text": "oklch(95% 0.02 320)",
      "--text-muted": "oklch(80% 0.05 310)",
      "--text-faint": "oklch(64% 0.06 300)",
      "--accent": "oklch(72% 0.24 340)",
      "--accent-text": "oklch(14% 0.04 340)",
      "--accent-soft-bg": "oklch(34% 0.1 330)",
      "--green-bg": "oklch(30% 0.08 170)",
      "--green-text": "oklch(85% 0.15 170)",
      "--green-solid": "oklch(75% 0.17 175)",
      "--amber-bg": "oklch(32% 0.08 70)",
      "--amber-text": "oklch(85% 0.12 75)",
      "--amber-solid": "oklch(78% 0.16 75)",
      "--red-bg": "oklch(30% 0.09 15)",
      "--red-text": "oklch(82% 0.15 15)",
      "--red-solid": "oklch(68% 0.2 15)",
      "--blue": "oklch(80% 0.14 220)",
      "--radius-sm": "10px",
      "--radius-md": "14px",
      "--radius-lg": "22px",
      "--font-display": '"Bungee", cursive',
      "--font-body": '"Poppins", sans-serif',
      "--shadow-card": "0 0 0 1px oklch(55% 0.15 320 / 0.35), 0 4px 20px oklch(50% 0.2 330 / 0.35)",
      "--shadow-btn": "0 0 22px color-mix(in oklch, var(--accent) 65%, transparent)",
    },
  },
  {
    id: "flashback",
    name: "90s Flashback",
    blurb: "Bright, bold, and outlined in black.",
    swatch: "oklch(68% 0.22 25)",
    dark: false,
    tokens: {
      "--bg": "oklch(96% 0.03 95)",
      "--card": "oklch(100% 0 0)",
      "--border": "oklch(15% 0 0)",
      "--border-soft": "oklch(80% 0.02 90)",
      "--border-width": "2.5px",
      "--text": "oklch(15% 0 0)",
      "--text-muted": "oklch(38% 0.01 90)",
      "--text-faint": "oklch(52% 0.01 90)",
      "--accent": "oklch(68% 0.22 25)",
      "--accent-text": "oklch(99% 0.01 90)",
      "--accent-soft-bg": "oklch(92% 0.08 90)",
      "--green-bg": "oklch(88% 0.14 145)",
      "--green-text": "oklch(28% 0.1 145)",
      "--green-solid": "oklch(58% 0.17 145)",
      "--amber-bg": "oklch(88% 0.14 90)",
      "--amber-text": "oklch(32% 0.08 70)",
      "--amber-solid": "oklch(72% 0.17 80)",
      "--red-bg": "oklch(88% 0.12 25)",
      "--red-text": "oklch(35% 0.15 25)",
      "--red-solid": "oklch(60% 0.2 25)",
      "--blue": "oklch(55% 0.18 255)",
      "--radius-sm": "8px",
      "--radius-md": "12px",
      "--radius-lg": "18px",
      "--font-display": '"Luckiest Guy", cursive',
      "--font-body": '"Baloo 2", sans-serif',
      "--shadow-card": "4px 4px 0 oklch(15% 0 0)",
      "--shadow-btn": "4px 4px 0 oklch(15% 0 0)",
    },
  },
  {
    id: "zen",
    name: "Zen",
    blurb: "Soft, warm, and unhurried.",
    swatch: "oklch(70% 0.08 150)",
    dark: false,
    tokens: {
      "--bg": "linear-gradient(160deg, oklch(96% 0.015 90), oklch(94% 0.025 150))",
      "--card": "oklch(98% 0.008 90)",
      "--border": "oklch(88% 0.015 130)",
      "--border-soft": "oklch(92% 0.012 120)",
      "--border-width": "1px",
      "--text": "oklch(30% 0.015 140)",
      "--text-muted": "oklch(50% 0.015 140)",
      "--text-faint": "oklch(64% 0.012 130)",
      "--accent": "oklch(70% 0.08 150)",
      "--accent-text": "oklch(20% 0.03 150)",
      "--accent-soft-bg": "oklch(92% 0.03 145)",
      "--green-bg": "oklch(91% 0.05 150)",
      "--green-text": "oklch(38% 0.08 150)",
      "--green-solid": "oklch(58% 0.09 150)",
      "--amber-bg": "oklch(91% 0.05 75)",
      "--amber-text": "oklch(42% 0.07 70)",
      "--amber-solid": "oklch(64% 0.1 75)",
      "--red-bg": "oklch(91% 0.04 40)",
      "--red-text": "oklch(45% 0.09 35)",
      "--red-solid": "oklch(60% 0.11 35)",
      "--blue": "oklch(55% 0.07 220)",
      "--radius-sm": "14px",
      "--radius-md": "18px",
      "--radius-lg": "26px",
      "--font-display": '"Quicksand", sans-serif',
      "--font-body": '"Karla", sans-serif',
      "--shadow-card": "0 6px 24px oklch(45% 0.03 150 / 0.08)",
      "--shadow-btn": "0 6px 20px color-mix(in oklch, var(--accent) 30%, transparent)",
    },
  },
];

// Every key any theme might set — cleared before applying a new theme so a
// previous theme's overrides (e.g. Tech's shadows or Retro's fonts) don't
// stick around on top of a theme that doesn't mention them.
const ALL_KEYS = [
  "--bg", "--card", "--border", "--border-soft", "--border-width",
  "--text", "--text-muted", "--text-faint",
  "--accent", "--accent-text", "--accent-soft-bg",
  "--green-bg", "--green-text", "--green-solid",
  "--amber-bg", "--amber-text", "--amber-solid",
  "--red-bg", "--red-text", "--red-solid",
  "--blue",
  "--radius-sm", "--radius-md", "--radius-lg",
  "--font-display", "--font-body",
  "--shadow-card", "--shadow-btn",
];

const OLD_KEY = "rallypoint.theme";
const KEY = "mtp.theme";

// "auto" follows the phone: Classic by day, Midnight when the phone is in
// dark mode. It's the default; anyone who had picked a non-default theme
// before keeps it.
export const AUTO = { id: "auto", name: "Match my phone", blurb: "Classic in light mode, Midnight in dark mode — switches with your phone." };
const dark = () => window.matchMedia?.("(prefers-color-scheme: dark)").matches;
const resolve = (id) => (id === "auto" ? (dark() ? "midnight" : "lime") : id);

export function getStoredThemeId() {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "auto" || THEMES.some((t) => t.id === stored)) return stored;
    const old = localStorage.getItem(OLD_KEY);
    return old && old !== "lime" && THEMES.some((t) => t.id === old) ? old : "auto";
  } catch {
    return "auto";
  }
}

let listening = false;
export function applyTheme(id) {
  const chosen = id === "auto" || THEMES.some((x) => x.id === id) ? id : "auto";
  const t = THEMES.find((x) => x.id === resolve(chosen)) || THEMES[0];
  const root = document.documentElement;
  ALL_KEYS.forEach((k) => root.style.removeProperty(k));
  Object.entries(t.tokens).forEach(([k, v]) => root.style.setProperty(k, v));
  root.style.colorScheme = t.dark ? "dark" : "light";
  try {
    localStorage.setItem(KEY, chosen);
  } catch {
    // best effort — a private/blocked storage context just won't persist the pick
  }
  if (!listening && window.matchMedia) {
    listening = true;
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
      if (getStoredThemeId() === "auto") applyTheme("auto");
    });
  }
  return chosen;
}
