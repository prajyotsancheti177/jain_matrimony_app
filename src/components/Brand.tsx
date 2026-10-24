import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { mix, useTheme } from '../theme';
import { D } from './Text';

// Bandhani mark (logo 3c): a centre dot, eight tie-dye dots with light centres, and an outer ring.
const INNER = [[73, 50], [66.3, 66.3], [50, 73], [33.7, 66.3], [27, 50], [33.7, 33.7], [50, 27], [66.3, 33.7]];
const OUTER = [[88.6, 60.3], [78.3, 78.3], [60.3, 88.6], [39.7, 88.6], [21.7, 78.3], [11.4, 60.3], [11.4, 39.7], [21.7, 21.7], [39.7, 11.4], [60.3, 11.4], [78.3, 21.7], [88.6, 39.7]];

export function BandhaniMark({ size = 64, tone = 'color' }: { size?: number; tone?: 'color' | 'inverse' }) {
  const t = useTheme();
  const inv = tone === 'inverse';
  const c1 = inv ? '#FFFFFF' : t.p;
  const c2 = inv ? t.a : mix(t.a, 78, '#000000');
  const eye = inv ? t.p : t.bg;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G>
        <Circle cx={50} cy={50} r={10} fill={c2} />
        <Circle cx={50} cy={50} r={3.4} fill={eye} />
        {INNER.map(([x, y]) => <Circle key={`i${x}${y}`} cx={x} cy={y} r={7} fill={c1} />)}
        {INNER.map(([x, y]) => <Circle key={`e${x}${y}`} cx={x} cy={y} r={2.4} fill={eye} />)}
        {OUTER.map(([x, y]) => <Circle key={`o${x}${y}`} cx={x} cy={y} r={4} fill={c2} />)}
      </G>
    </Svg>
  );
}

/** App icon tile + "SoulSync" wordmark. */
export function Logo({ size = 96, layout = 'stack', wordSize }: { size?: number; layout?: 'stack' | 'row' | 'icon'; wordSize?: number }) {
  const t = useTheme();
  const row = layout === 'row';
  return (
    <View style={{ flexDirection: row ? 'row' : 'column', alignItems: 'center', gap: size * (row ? 0.22 : 0.2) }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: `linear-gradient(150deg, ${mix(t.p, 72, '#FFFFFF')}, ${t.p} 70%)`,
          boxShadow: `0px 12px 28px -12px ${t.p}`,
        }}
      >
        <BandhaniMark size={Math.round(size * 0.66)} tone="inverse" />
      </View>
      {layout !== 'icon' && (
        <D style={{ fontSize: wordSize ?? size * 0.5, lineHeight: (wordSize ?? size * 0.5) * 1.25, letterSpacing: -0.3 }}>
          Soul<D style={{ color: t.p }}>Sync</D>
        </D>
      )}
    </View>
  );
}
