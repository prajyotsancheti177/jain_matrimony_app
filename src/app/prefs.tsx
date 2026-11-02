// 2q · Preferences (design A: removable summary chips, one age slider, collapsible groups).
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View, type GestureResponderEvent } from 'react-native';
import { api, type Prefs } from '../api';
import { Diet, Education, Family, INCOME_PREF_LABELS, Marital, Occupation, PREF_CITIES, PREF_STATES, PREF_SUBSECTS, Sect } from '../api/enums';
import { Button, Chip, Switch } from '../components/Controls';
import { Icon, type IconName } from '../components/Icon';
import { Card, Screen, StickyFooter } from '../components/Screen';
import { D, T } from '../components/Text';
import { invalidate, useQuery } from '../lib/query';
import { toast, toastError } from '../lib/stores';
import { isIOS, mix, useTheme } from '../theme';

const MIN = 18, MAX = 80;
const TICKS = [18, 30, 45, 60, 80];

type ListKey = 'marital' | 'sect' | 'subSect' | 'diet' | 'education' | 'occupation' | 'family' | 'states' | 'cities';
type Group = { key: ListKey | 'minIncome' | 'location'; title: string; icon: IconName; any: string };

const GROUPS: Group[] = [
  { key: 'marital', title: 'Marital status', icon: 'favorite', any: 'Any marital status' },
  { key: 'sect', title: 'Sect', icon: 'self_improvement', any: 'Any sect' },
  { key: 'subSect', title: 'Sub-sect', icon: 'account_tree', any: 'Any sub-sect' },
  { key: 'diet', title: 'Diet', icon: 'eco', any: 'Any diet' },
  { key: 'location', title: 'Location', icon: 'location_on', any: 'Anywhere' },
  { key: 'education', title: 'Education', icon: 'school', any: 'Any education' },
  { key: 'occupation', title: 'Work', icon: 'work', any: 'Any work' },
  { key: 'minIncome', title: 'Minimum income', icon: 'currency_rupee', any: 'No minimum' },
  { key: 'family', title: 'Family type', icon: 'family_restroom', any: 'Any family type' },
];

const INCOMES = INCOME_PREF_LABELS.filter((x) => x !== 'Any');

export default function PrefsScreen() {
  const t = useTheme();
  const q = useQuery('prefs', () => api.getPrefs());
  const [edited, setP] = useState<Prefs | null>(null);
  const p = edited ?? q.data ?? null;
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [city, setCity] = useState('');

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

  if (!p) {
    return (
      <Screen header={{ title: 'Preferences', back: { label: 'Profile' } }}>
        {q.error ? <T style={{ color: t.mut, marginTop: 32, textAlign: 'center' }}>{q.error.message}</T> : <ActivityIndicator color={t.p} style={{ marginTop: 48 }} />}
      </Screen>
    );
  }

  const set = (patch: Partial<Prefs>) => setP({ ...p, ...patch });
  const options: Record<ListKey, string[]> = {
    marital: Marital.labels, sect: Sect.labels, subSect: PREF_SUBSECTS, diet: Diet.labels,
    education: Education.labels, occupation: Occupation.labels, family: Family.labels, states: PREF_STATES,
    // Cities you typed yourself stay in the list next to the suggested ones.
    cities: [...PREF_CITIES, ...p.cities.filter((c) => !PREF_CITIES.includes(c))],
  };
  const toggle = (k: ListKey, v: string) => set({ [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] });
  const picked = (g: Group): string[] =>
    g.key === 'location' ? [...p.states, ...p.cities] : g.key === 'minIncome' ? (p.minIncome && p.minIncome !== 'Any' ? [p.minIncome] : []) : p[g.key];
  const clear = (g: Group) =>
    set(g.key === 'location' ? { states: [], cities: [] } : g.key === 'minIncome' ? { minIncome: 'Any' } : { [g.key]: [] });

  const ageSet = p.minAge !== MIN || p.maxAge !== MAX;
  const active: { label: string; remove: () => void }[] = [
    ...(ageSet ? [{ label: `Age ${p.minAge}–${p.maxAge}`, remove: () => set({ minAge: MIN, maxAge: MAX }) }] : []),
    ...GROUPS.flatMap((g) =>
      g.key === 'minIncome'
        ? picked(g).map((v) => ({ label: `Income ${v}`, remove: () => set({ minIncome: 'Any' }) }))
        : g.key === 'location'
          ? [...p.states.map((v) => ({ label: v, remove: () => toggle('states', v) })), ...p.cities.map((v) => ({ label: v, remove: () => toggle('cities', v) }))]
          : p[g.key].map((v) => ({ label: v, remove: () => toggle(g.key as ListKey, v) })),
    ),
  ];
  const resetAll = () => set({ minAge: MIN, maxAge: MAX, marital: [], sect: [], subSect: [], diet: [], education: [], occupation: [], family: [], states: [], cities: [], minIncome: 'Any' });

  const addCity = () => {
    const c = city.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    if (c && !p.cities.some((x) => x.toLowerCase() === c.toLowerCase())) set({ cities: [...p.cities, c] });
    setCity('');
  };

  const chips = (k: ListKey) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options[k].map((o) => <Chip key={o} label={o} on={p[k].includes(o)} onPress={() => toggle(k, o)} />)}
    </View>
  );

  const body = (g: Group) => {
    if (g.key === 'minIncome') {
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {INCOMES.map((o) => <Chip key={o} label={o} on={p.minIncome === o} onPress={() => set({ minIncome: p.minIncome === o ? 'Any' : o })} />)}
        </View>
      );
    }
    if (g.key === 'location') {
      return (
        <View style={{ gap: 14 }}>
          <T style={{ fontSize: 13, fontWeight: '600', color: t.mut }}>States</T>
          {chips('states')}
          <T style={{ fontSize: 13, fontWeight: '600', color: t.mut, marginTop: 4 }}>Cities</T>
          {chips('cities')}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput value={city} onChangeText={setCity} onSubmitEditing={addCity} submitBehavior="submit" returnKeyType="done"
              placeholder="Add another city" placeholderTextColor={t.mut} accessibilityLabel="Add a city" selectionColor={t.p} maxLength={40}
              style={[{ flex: 1, height: 44, paddingHorizontal: 14, fontSize: 15, color: t.ink, outlineStyle: 'none' } as object,
                isIOS ? { borderRadius: t.fieldR, backgroundColor: t.bg } : { borderRadius: 4, borderWidth: 1, borderColor: t.outline, backgroundColor: 'transparent' }]} />
            <Pressable onPress={addCity} disabled={!city.trim()} accessibilityRole="button" accessibilityLabel="Add city"
              style={({ pressed }) => ({ height: 44, paddingHorizontal: 16, borderRadius: t.btnR, backgroundColor: t.soft, justifyContent: 'center', opacity: !city.trim() ? 0.45 : pressed ? 0.7 : 1 })}>
              <T style={{ color: t.p, fontSize: 15, fontWeight: '600' }}>Add</T>
            </Pressable>
          </View>
        </View>
      );
    }
    return chips(g.key);
  };

  return (
    <Screen header={{ title: 'Preferences', back: { label: 'Profile' } }} fill
      footer={
        <StickyFooter blur={false}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Reset" kind="ground" onPress={resetAll} disabled={!active.length} style={{ paddingHorizontal: 22 }} />
            <Button label="Save preferences" onPress={save} busy={busy} style={{ flex: 1 }} />
          </View>
        </StickyFooter>
      }
      contentStyle={{ paddingTop: 4, paddingHorizontal: 16, paddingBottom: 24 }}>
      {/* What's on right now: each one removable in a tap. */}
      {active.length > 0 ? (
        <View style={{ marginHorizontal: -16, marginBottom: 14 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}>
            {active.map((a) => (
              <Pressable key={a.label} onPress={a.remove} accessibilityRole="button" accessibilityLabel={`Remove ${a.label}`}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingLeft: 12, paddingRight: 8, borderRadius: t.chipR, backgroundColor: t.s, borderWidth: 1, borderColor: t.line, opacity: pressed ? 0.6 : 1 })}>
                <T style={{ fontSize: 13.5, fontWeight: '500' }}>{a.label}</T>
                <Icon name="close" size={16} color={t.mut} />
              </Pressable>
            ))}
            <Pressable onPress={resetAll} accessibilityRole="button" style={{ height: 34, paddingHorizontal: 8, justifyContent: 'center' }}>
              <T style={{ fontSize: 13.5, fontWeight: '600', color: t.p }}>Clear all</T>
            </Pressable>
          </ScrollView>
        </View>
      ) : (
        <T style={{ fontSize: 14, color: t.mut, marginHorizontal: 4, marginBottom: 14 }}>{"No filters yet. You'll see everyone who fits your basics."}</T>
      )}

      <Card style={{ paddingVertical: 16, paddingHorizontal: 18, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <T style={{ fontSize: 16, fontWeight: '600' }}>Age</T>
          <D style={{ color: t.p, fontSize: 24, lineHeight: 30 }}>
            {p.minAge} – {p.maxAge}{p.maxAge === MAX ? '+' : ''} <T style={{ fontSize: 13, color: t.mut }}>yrs</T>
          </D>
        </View>
        <AgeRange min={p.minAge} max={p.maxAge} onChange={(minAge, maxAge) => set({ minAge, maxAge })} />
      </Card>

      <View style={{ gap: 10 }}>
        {GROUPS.map((g) => {
          const sel = picked(g);
          const isOpen = open === g.key;
          return (
            <Card key={g.key} style={{ padding: 0, overflow: 'hidden' }}>
              <Pressable onPress={() => setOpen(isOpen ? null : g.key)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}
                accessibilityLabel={`${g.title}, ${sel.length ? sel.join(', ') : g.any}`} android_ripple={{ color: t.line }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 64 }}>
                <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={g.icon} size={20} color={t.p} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T style={{ fontSize: 15.5, fontWeight: '600' }}>{g.title}</T>
                  <T numberOfLines={1} style={{ fontSize: 13.5, marginTop: 1, color: sel.length ? t.p : t.mut, fontWeight: sel.length ? '500' : '400' }}>
                    {sel.length ? sel.join(', ') : g.any}
                  </T>
                </View>
                {sel.length > 0 && (
                  <View style={{ minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: t.p, alignItems: 'center', justifyContent: 'center' }}>
                    <T style={{ color: t.op, fontSize: 12, fontWeight: '700' }}>{sel.length}</T>
                  </View>
                )}
                <Icon name={isOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down'} size={24} color={t.mut} />
              </Pressable>
              {isOpen && (
                <View style={{ paddingHorizontal: 14, paddingBottom: 16, gap: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderColor: t.line }}>
                    <T style={{ fontSize: 14.5 }}>{g.any}</T>
                    <Switch on={!sel.length} onChange={(v) => v && clear(g)} label={g.any} />
                  </View>
                  {body(g)}
                  {g.key !== 'minIncome' && g.key !== 'location' && (
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 4 }}>
                      <TextLink label="Select all" onPress={() => set({ [g.key]: options[g.key as ListKey] })} color={t.p} disabled={sel.length === options[g.key as ListKey].length} />
                      <TextLink label="Clear" onPress={() => clear(g)} color={t.p} disabled={!sel.length} />
                    </View>
                  )}
                </View>
              )}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

function TextLink({ label, onPress, color, disabled }: { label: string; onPress: () => void; color: string; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }}
      style={({ pressed }) => ({ height: 36, paddingHorizontal: 10, justifyContent: 'center', opacity: disabled ? 0.35 : pressed ? 0.6 : 1 })}>
      <T style={{ fontSize: 14, fontWeight: '600', color }}>{label}</T>
    </Pressable>
  );
}

/** Two-handle age slider. Drag either handle; they can't cross. */
function AgeRange({ min, max, onChange }: { min: number; max: number; onChange: (min: number, max: number) => void }) {
  const t = useTheme();
  const [w, setW] = useState(0);
  const drag = useRef({ x: 0, v: 0 });
  const pct = (v: number) => ((v - MIN) / (MAX - MIN)) * 100;
  const move = (which: 'min' | 'max', pageX: number) => {
    if (!w) return;
    const v = Math.round(drag.current.v + ((pageX - drag.current.x) / w) * (MAX - MIN));
    if (which === 'min') onChange(Math.max(MIN, Math.min(v, max - 1)), max);
    else onChange(min, Math.min(MAX, Math.max(v, min + 1)));
  };
  const handlers = (which: 'min' | 'max') => ({
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      drag.current = { x: e.nativeEvent.pageX, v: which === 'min' ? min : max };
    },
    onResponderMove: (e: GestureResponderEvent) => move(which, e.nativeEvent.pageX),
  });

  const nudge = (which: 'min' | 'max', d: number) =>
    which === 'min' ? onChange(Math.max(MIN, Math.min(min + d, max - 1)), max) : onChange(min, Math.min(MAX, Math.max(max + d, min + 1)));

  return (
    <View style={{ marginTop: 18 }}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: 32, justifyContent: 'center', marginHorizontal: 14 }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: t.line }} />
        <View style={{ position: 'absolute', height: 6, borderRadius: 3, left: `${pct(min)}%`, width: `${pct(max) - pct(min)}%`, backgroundColor: t.p }} />
        {(['min', 'max'] as const).map((which) => (
          <View key={which} {...handlers(which)}
            accessible accessibilityRole="adjustable" accessibilityLabel={which === 'min' ? 'Youngest age' : 'Oldest age'}
            accessibilityValue={{ min: MIN, max: MAX, now: which === 'min' ? min : max }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(e) => nudge(which, e.nativeEvent.actionName === 'increment' ? 1 : -1)}
            hitSlop={10}
            style={{ position: 'absolute', left: `${pct(which === 'min' ? min : max)}%`, marginLeft: -16, width: 32, height: 32, borderRadius: 16, backgroundColor: t.s, borderWidth: 2.5, borderColor: t.p, boxShadow: '0px 2px 6px rgba(0,0,0,0.18)', cursor: 'grab' } as object} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginHorizontal: 4 }}>
        {TICKS.map((v) => <T key={v} style={{ fontSize: 12, color: mix(t.ink, 50, t.bg), fontVariant: ['tabular-nums'] }}>{v === MAX ? `${v}+` : v}</T>)}
      </View>
    </View>
  );
}
