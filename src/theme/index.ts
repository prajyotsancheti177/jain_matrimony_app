import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { alpha, mix } from './color';
import { FONTS, PALETTES, type FontId, type Palette, type PaletteId, type ScoreStyle } from './palettes';

export * from './palettes';
export { alpha, mix } from './color';

type ThemeState = {
  palette: PaletteId;
  custom: Palette | null;
  font: FontId;
  score: ScoreStyle;
  setPalette: (id: PaletteId) => void;
  setCustom: (key: keyof Palette, value: string) => void;
  resetCustom: () => void;
  setFont: (id: FontId) => void;
  setScore: (s: ScoreStyle) => void;
};

/** Theme-lab choices, persisted on the device. */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      palette: 'peacock',
      custom: null,
      font: 'baloo',
      score: 'bars',
      setPalette: (palette) => set({ palette, custom: null }),
      setCustom: (key, value) =>
        set({ custom: { ...(get().custom ?? PALETTES[get().palette]), name: 'Custom', [key]: value } }),
      resetCustom: () => set({ custom: null }),
      setFont: (font) => set({ font }),
      setScore: (score) => set({ score }),
    }),
    {
      name: 'soulsync-theme',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ palette, custom, font, score }) => ({ palette, custom, font, score }),
    },
  ),
);

export const isIOS = Platform.OS === 'ios';
export const isAndroid = !isIOS;

export function buildTheme(c: Palette, fontId: FontId, score: ScoreStyle) {
  const ok = '#1F8A5B';
  const bad = '#C62F3B';
  const soft = mix(c.p, 13, c.s);
  const line = mix(c.ink, 10, c.bg);
  const outline = mix(c.ink, 34, c.bg);
  const mut = mix(c.ink, 68, c.bg);
  const font = FONTS[fontId] ?? FONTS.baloo;
  const ios = isIOS;
  return {
    ...c,
    ok,
    bad,
    soft,
    line,
    outline,
    mut,
    score,
    displayFont: font.family,
    /** Tint of primary used for Android tonal surfaces (sheets, dialogs, nav bar). */
    tonal: (pct: number) => mix(c.p, pct, c.s),
    // Platform variables (PV in the design).
    btnR: ios ? 14 : 999,
    btnH: ios ? 50 : 48,
    chipR: ios ? 999 : 8,
    fieldR: ios ? 12 : 4,
    card: ios ? c.s : mix(c.p, 7, c.s),
    cardShadow: ios ? `0px 10px 28px -14px ${alpha(c.p, 0.45)}` : undefined,
    grpBg: ios ? c.s : 'transparent',
    grpR: ios ? 12 : 0,
    grpPx: ios ? 16 : 0,
    sectionHeader: ios
      ? { color: mut, textTransform: 'uppercase' as const, fontSize: 12.5, letterSpacing: 0.4, fontWeight: '400' as const }
      : { color: c.p, textTransform: 'none' as const, fontSize: 14, letterSpacing: 0, fontWeight: '500' as const },
    /** The soft two-colour glow (radial-gradient pair) used behind headers and cards. */
    aura: (spread = '120%', base = soft) =>
      `radial-gradient(90% ${spread} at 0% 0%, ${c.g1}, transparent 70%), radial-gradient(90% ${spread} at 100% 100%, ${c.g2}, transparent 70%), linear-gradient(${base}, ${base})`,
    avatarBg: `radial-gradient(circle at 30% 30%, ${c.g1}, ${c.g2})`,
    accentBar: `linear-gradient(90deg, ${c.a}, ${c.p})`,
    dark: luminance(c.bg) < 0.3,
  };
}

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

export type Theme = ReturnType<typeof buildTheme>;

export function useTheme(): Theme {
  const { palette, custom, font, score } = useThemeStore();
  return useMemo(() => buildTheme(custom ?? PALETTES[palette] ?? PALETTES.peacock, font, score), [palette, custom, font, score]);
}
