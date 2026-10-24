import { View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import type { ScoreRow } from '../api';
import { alpha, mix, useTheme } from '../theme';
import { D, T } from './Text';

/** One petal: CSS `border-radius: 50%/64% 64% 36% 36%` box of w×h, bottom edge at (0,0). */
function petalPath(w: number, h: number) {
  const top = h * 0.64, bot = h * 0.36, y0 = -h + top; // the widest point
  return `M ${-w / 2} ${y0} A ${w / 2} ${top} 0 0 1 ${w / 2} ${y0} A ${w / 2} ${bot} 0 0 1 ${-w / 2} ${y0} Z`;
}

/** Score style 3g: five petals that grow with each factor's fit, number in the middle. */
export function Petals({ rows, size, total }: { rows: ScoreRow[]; size: number; total?: number }) {
  const t = useTheme();
  const w = size * 0.3, full = size * 0.5, c = size / 2, cd = size * 0.42;
  const score = total ?? rows.reduce((a, r) => a + r.pts, 0);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="pg" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={t.p} />
            <Stop offset="1" stopColor={mix(t.p, 60, t.a)} />
          </LinearGradient>
        </Defs>
        {rows.map((r, i) => {
          const h = full * Math.max(0.3, r.max ? r.pts / r.max : 0);
          return (
            <G key={r.key} transform={`translate(${c} ${c}) rotate(${i * 72})`}>
              <Path d={petalPath(w, full)} fill={mix(t.p, 13, t.s)} />
              <Path d={petalPath(w, h)} fill="url(#pg)" />
            </G>
          );
        })}
        <Circle cx={c} cy={c} r={cd / 2} fill={t.s} />
      </Svg>
      <View style={{ position: 'absolute', left: c - cd / 2, top: c - cd / 2, width: cd, height: cd, borderRadius: cd / 2, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 2px 8px -2px rgba(0,0,0,0.18)' }}>
        <D style={{ color: t.p, fontSize: size * 0.17, lineHeight: size * 0.22 }}>{score}</D>
      </View>
    </View>
  );
}

/** Match-card badge: "95%" over "match" on a white tile. */
export function ScoreBadge({ total }: { total: number }) {
  const t = useTheme();
  return (
    <View style={{ minWidth: 76, height: 66, paddingHorizontal: 10, borderRadius: 18, backgroundColor: t.s, alignItems: 'center', justifyContent: 'center', boxShadow: `0px 6px 16px -10px ${alpha(t.p, 0.6)}` }}>
      <D style={{ color: t.p, fontSize: 28, lineHeight: 32 }}>{total}%</D>
      <T style={{ fontSize: 11.5, color: t.mut, marginTop: -1 }}>match</T>
    </View>
  );
}

/** Profile tile: the number on a soft square. */
export function ScoreTile({ total }: { total: number }) {
  const t = useTheme();
  return (
    <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center' }}>
      <D style={{ color: t.p, fontSize: 24, lineHeight: 30 }}>{total}</D>
    </View>
  );
}

/** Breakdown header: big number over "out of 100". */
export function ScoreHero({ total }: { total: number }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingTop: 8 }}>
      <D style={{ color: t.p, fontSize: 96, lineHeight: 100 }}>{total}</D>
      <T style={{ fontSize: 14, color: t.mut, marginTop: 4 }}>out of 100</T>
    </View>
  );
}

/** One factor bar for the breakdown. */
export function FactorBar({ pts, max }: { pts: number; max: number }) {
  const t = useTheme();
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: t.soft, overflow: 'hidden', marginTop: 10 }}>
      <View style={{ width: `${max ? Math.round((pts / max) * 100) : 0}%`, height: '100%', borderRadius: 4, backgroundColor: t.p }} />
    </View>
  );
}
