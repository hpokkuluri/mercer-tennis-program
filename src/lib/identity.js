// Small pure helpers shared by both backends — no state lives here now
// that real accounts (Firebase Auth, or the local demo equivalent)
// own identity.

export const COLORS = [
  { bg: "oklch(85% 0.08 250)", text: "oklch(32% 0.06 250)" },
  { bg: "oklch(87% 0.1 70)", text: "oklch(35% 0.08 70)" },
  { bg: "oklch(86% 0.09 320)", text: "oklch(33% 0.07 320)" },
  { bg: "oklch(87% 0.07 20)", text: "oklch(36% 0.06 20)" },
  { bg: "oklch(85% 0.12 140)", text: "oklch(30% 0.09 140)" },
  { bg: "oklch(84% 0.09 190)", text: "oklch(30% 0.07 190)" },
];

export function initials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function colorFor(uid) {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
}
