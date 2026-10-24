import Svg, { Path } from 'react-native-svg';
import { GLYPHS } from '../icons/glyphs';

type Glyph = keyof typeof GLYPHS;
export type IconName = Exclude<Glyph, `${string}-fill` | `${string}-thin`>;

/** Material Symbols Rounded, drawn as SVG so the filled variants work on every platform. */
export function Icon({ name, size = 24, color = '#000', fill = false }: { name: IconName; size?: number; color?: string; fill?: boolean }) {
  const d = (fill ? GLYPHS[`${name}-fill` as Glyph] : undefined) ?? GLYPHS[name];
  return (
    <Svg width={size} height={size} viewBox="0 -960 960 960">
      <Path d={d} fill={color} />
    </Svg>
  );
}

/** The thin folded-hands glyph used as the Jai Jinendra mark on the welcome screen (option 6a). */
export function FoldedHands({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 -960 960 960">
      <Path d={GLYPHS['folded_hands-thin']} fill={color} />
    </Svg>
  );
}
