// 2i · Match breakdown: the number (or petals) and one bar per factor.
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { api } from '../../api';
import { Empty, Screen } from '../../components/Screen';
import { FactorBar, Petals, ScoreHero } from '../../components/Score';
import { D, T } from '../../components/Text';
import { useQuery } from '../../lib/query';
import { useTheme } from '../../theme';

export default function Compat() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery(`profile:${id}`, () => api.profile(id));
  const m = q.data;
  const s = m?.score;
  const petals = t.score === 'petals';

  return (
    <Screen aura header={{ title: 'Match', back: { label: 'Back' }, clear: true }} contentStyle={{ paddingTop: 8, paddingHorizontal: 20, paddingBottom: 28 }}>
      {!m || !s ? (
        q.error || (m && !s) ? <Empty icon="error" text={q.error?.message ?? 'Score not available yet.'} /> : <ActivityIndicator color={t.p} style={{ marginTop: 48 }} />
      ) : (
        <>
          <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 20 }}>
            {petals ? <Petals rows={s.rows} size={210} total={s.total} /> : <ScoreHero total={s.total} />}
            <D style={{ color: t.p, fontSize: 24, lineHeight: 30, marginTop: 16 }}>You &amp; {m.first}</D>
            <T style={{ fontSize: 14.5, color: t.mut, marginTop: 4 }}>Five things, scored out of 100</T>
          </View>
          <View style={{ gap: 10 }}>
            {s.rows.map((r) => (
              <View key={r.key} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, backgroundColor: t.card, boxShadow: t.cardShadow }}>
                {petals && <View style={{ width: 14, height: 14, marginTop: 3, borderTopLeftRadius: 7, borderTopRightRadius: 7, borderBottomLeftRadius: 5, borderBottomRightRadius: 5, backgroundColor: t.p }} />}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <T style={{ fontSize: 15.5, fontWeight: '600' }}>{r.label}</T>
                    <T style={{ fontSize: 15, fontWeight: '600' }}>
                      {r.pts}
                      <T style={{ color: t.mut, fontWeight: '400', fontSize: 15 }}>/{r.max}</T>
                    </T>
                  </View>
                  {!petals && <FactorBar pts={r.pts} max={r.max} />}
                  <T style={{ fontSize: 13.5, lineHeight: 19, color: t.mut, marginTop: 6 }}>{r.why}</T>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
