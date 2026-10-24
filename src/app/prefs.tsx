// 2q · Preferences.
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { api, type Prefs } from '../api';
import { Diet, Family, INCOME_PREF_LABELS, Marital, PREF_CITIES, PREF_SUBSECTS, Sect } from '../api/enums';
import { Button, ChipGroup } from '../components/Controls';
import { Icon } from '../components/Icon';
import { Screen, StickyFooter } from '../components/Screen';
import { D, T } from '../components/Text';
import { invalidate, useQuery } from '../lib/query';
import { toast, toastError } from '../lib/stores';
import { useTheme } from '../theme';

const MIN = 18, MAX = 80;

export default function PrefsScreen() {
  const t = useTheme();
  const q = useQuery('prefs', () => api.getPrefs());
  const [edited, setP] = useState<Prefs | null>(null);
  const p = edited ?? q.data ?? null;
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!p) return;
    setBusy(true);
    try {
      await api.savePrefs(p);
      invalidate('prefs', 'matches');
      router.back();
      toast('Preferences saved');
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const groups: [string, keyof Prefs, string[], boolean][] = [
    ['Marital status', 'marital', Marital.labels, true],
    ['Sect', 'sect', Sect.labels, true],
    ['Sub-sect', 'subSect', PREF_SUBSECTS, true],
    ['Diet', 'diet', Diet.labels, true],
    ['Minimum income', 'minIncome', INCOME_PREF_LABELS, false],
    ['Family', 'family', Family.labels, true],
    ['Cities', 'cities', PREF_CITIES, true],
  ];

  const step = (k: 'minAge' | 'maxAge', d: number) =>
    setP(() => {
      if (!p) return p;
      const v = p[k] + d;
      return k === 'minAge' ? { ...p, minAge: Math.max(MIN, Math.min(v, p.maxAge)) } : { ...p, maxAge: Math.min(MAX, Math.max(v, p.minAge)) };
    });

  const span = MAX - MIN;
  const l = p ? ((p.minAge - MIN) / span) * 100 : 0;
  const r = p ? ((p.maxAge - MIN) / span) * 100 : 0;

  return (
    <Screen header={{ title: 'Preferences', back: { label: 'Profile' } }} fill footer={p && <StickyFooter blur={false}><Button label="Save" onPress={save} busy={busy} /></StickyFooter>}
      contentStyle={{ paddingTop: 8, paddingHorizontal: 20 }}>
      {!p ? (
        q.error ? <T style={{ color: t.mut, marginTop: 32, textAlign: 'center' }}>{q.error.message}</T> : <ActivityIndicator color={t.p} style={{ marginTop: 48 }} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <T style={{ fontSize: 15, fontWeight: '600' }}>Age</T>
            <D style={{ color: t.p, fontSize: 20, lineHeight: 26 }}>{p.minAge}–{p.maxAge}</D>
          </View>
          <View accessible accessibilityLabel={`Age range ${p.minAge} to ${p.maxAge}`} style={{ height: 6, borderRadius: 3, backgroundColor: t.line, marginTop: 10, marginHorizontal: 12, marginBottom: 16 }}>
            <View style={{ position: 'absolute', top: 0, bottom: 0, left: `${l}%`, width: `${r - l}%`, borderRadius: 3, backgroundImage: t.accentBar }} />
            {[l, r].map((x, i) => (
              <View key={i} style={{ position: 'absolute', top: -11, left: `${x}%`, width: 28, height: 28, marginLeft: -14, borderRadius: 14, backgroundColor: t.s, boxShadow: '0px 2px 8px rgba(0,0,0,0.2)' }} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
            {(['minAge', 'maxAge'] as const).map((k) => (
              <View key={k} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 4, borderRadius: 14, backgroundColor: t.card }}>
                <Pressable onPress={() => step(k, -1)} accessibilityLabel={`Lower ${k === 'minAge' ? 'minimum' : 'maximum'} age`} style={{ width: 44, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="remove" size={20} color={t.p} />
                </Pressable>
                <T style={{ fontSize: 14, fontWeight: '500' }}>{k === 'minAge' ? 'Min' : 'Max'} {p[k]}</T>
                <Pressable onPress={() => step(k, 1)} accessibilityLabel={`Raise ${k === 'minAge' ? 'minimum' : 'maximum'} age`} style={{ width: 44, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="add" size={20} color={t.p} />
                </Pressable>
              </View>
            ))}
          </View>
          {groups.map(([title, key, options, multi]) => (
            <View key={key} style={{ marginBottom: 22 }}>
              <T style={{ fontSize: 15, fontWeight: '600', marginBottom: 10 }}>{title}</T>
              <ChipGroup options={options} multi={multi} value={multi ? (p[key] as string[]) : [p[key] as string]}
                onChange={(v) => setP({ ...p, [key]: multi ? v : v[0] })} />
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}
