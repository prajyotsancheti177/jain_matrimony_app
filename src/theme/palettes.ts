// Palettes, display fonts and score styles from "Jain Matrimony App v2".
// Peacock (4e) + Baloo 2 + "number + bars" (3h) are the shipped defaults;
// the rest are reachable from the hidden Theme lab (long-press your profile card).

export type PaletteColors = {
  p: string; // primary
  op: string; // on primary
  a: string; // accent
  bg: string; // background
  s: string; // surface
  ink: string; // text
  g1: string; // aura 1
  g2: string; // aura 2
};
export type Palette = PaletteColors & { name: string };

export const PALETTES = {
  peacock: { name: 'Peacock', p: '#0E6E78', op: '#FFFFFF', a: '#FFC857', bg: '#F1FAF9', s: '#FFFFFF', ink: '#0C2629', g1: '#CDEFEF', g2: '#FFF0C7' },
  lavender: { name: 'Lavender Dream', p: '#5B3FD1', op: '#FFFFFF', a: '#FF8FA3', bg: '#F7F4FF', s: '#FFFFFF', ink: '#1F1640', g1: '#E3D9FF', g2: '#FFE1D6' },
  peach: { name: 'Peach Sorbet', p: '#D24E2E', op: '#FFFFFF', a: '#7C5CFF', bg: '#FFF6F1', s: '#FFFFFF', ink: '#3A1A12', g1: '#FFD9C7', g2: '#FFF0B8' },
  mint: { name: 'Mint Mithai', p: '#0F7A61', op: '#FFFFFF', a: '#FF9F68', bg: '#F2FBF7', s: '#FFFFFF', ink: '#0F2E26', g1: '#CDF3E4', g2: '#E6E4FF' },
  rose: { name: 'Rose Kulfi', p: '#B8336E', op: '#FFFFFF', a: '#5B3FD1', bg: '#FFF4F8', s: '#FFFFFF', ink: '#3A1428', g1: '#FFD6E7', g2: '#E0DBFF' },
  midnight: { name: 'Midnight (dark)', p: '#B4A4FF', op: '#1A1238', a: '#FF8FA3', bg: '#14111F', s: '#211B33', ink: '#F1EEFF', g1: '#33296A', g2: '#46243A' },
} satisfies Record<string, Palette>;
export type PaletteId = keyof typeof PALETTES;

export const FONTS = {
  baloo: { name: 'Baloo 2', family: 'Baloo2_700Bold', note: 'Rounded, Indian-designed' },
  bricolage: { name: 'Bricolage', family: 'BricolageGrotesque_700Bold', note: 'Quirky grotesk' },
  fredoka: { name: 'Fredoka', family: 'Fredoka_600SemiBold', note: 'Soft and round' },
  young: { name: 'Young Serif', family: 'YoungSerif_400Regular', note: 'Warm serif' },
  gloock: { name: 'Gloock', family: 'Gloock_400Regular', note: 'High-contrast serif' },
  unbounded: { name: 'Unbounded', family: 'Unbounded_600SemiBold', note: 'Wide and modern' },
  shrikhand: { name: 'Shrikhand', family: 'Shrikhand_400Regular', note: 'Gujarati-inspired script' },
} as const;
export type FontId = keyof typeof FONTS;

export type ScoreStyle = 'bars' | 'petals';
