// Hidden Theme lab (long-press your profile card): the design page's colour, font and score-style
// switcher, so looks can be tried on a real phone. Choices persist on the device.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BandhaniMark } from '../components/Brand';
import { Segmented, TextButton } from '../components/Controls';
import { D, T } from '../components/Text';
import { FONTS, PALETTES, isIOS, useTheme, useThemeStore, type FontId, type Palette, type PaletteId } from '../theme';
import { isHex as validHex } from '../theme/color';

const PICKERS: [keyof Palette, string][] = [['p', 'Primary'], ['a', 'Accent'], ['bg', 'Background'], ['ink', 'Ink'], ['g1', 'Aura 1'], ['g2', 'Aura 2']];

export default function ThemeLab() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = useThemeStore();
  const cur = s.custom ?? PALETTES[s.palette];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8 }}>
        <T accessibilityRole="header" style={{ fontSize: 20, fontWeight: '700' }}>Theme lab</T>
        <TextButton label="Done" bold onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 24 }}>
        <Section title="Colour palette" note={s.custom ? 'Custom' : cur.name}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(Object.keys(PALETTES) as PaletteId[]).map((id) => {
              const p = PALETTES[id];
              const on = !s.custom && s.palette === id;
              return (
                <Pressable key={id} onPress={() => s.setPalette(id)} accessibilityState={{ selected: on }}
                  style={{ width: '48%', flexGrow: 1, gap: 8, padding: 10, borderRadius: 14, borderWidth: 2, borderColor: on ? p.p : t.line, backgroundColor: t.s }}>
                  <View style={{ height: 40, borderRadius: 9, backgroundImage: `radial-gradient(80% 120% at 0% 0%, ${p.g1}, transparent 70%), radial-gradient(80% 120% at 100% 100%, ${p.g2}, transparent 70%), linear-gradient(${p.bg}, ${p.bg})`, flexDirection: 'row', alignItems: 'flex-end', gap: 4, padding: 8 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: p.p }} />
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: p.a }} />
                  </View>
                  <T style={{ fontSize: 13, fontWeight: '600', color: '#1F1640' }}>{p.name}</T>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="Try your own" note="Tints, lines and secondary text follow automatically">
          <View style={{ gap: 8 }}>
            {PICKERS.map(([k, label]) => <HexRow key={k} label={label} value={cur[k]} onChange={(v) => s.setCustom(k, v)} />)}
          </View>
          {s.custom && <TextButton label="Reset" onPress={s.resetCustom} />}
        </Section>

        <Section title="Display font" note={FONTS[s.font].note}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(Object.keys(FONTS) as FontId[]).map((id) => {
              const f = FONTS[id];
              const on = s.font === id;
              return (
                <Pressable key={id} onPress={() => s.setFont(id)} accessibilityState={{ selected: on }}
                  style={{ width: '48%', flexGrow: 1, gap: 2, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: 2, borderColor: on ? t.p : 'transparent', backgroundColor: on ? t.soft : t.card }}>
                  <D style={{ fontFamily: f.family, fontSize: 24, lineHeight: 30 }} numberOfLines={1}>Soul<D style={{ fontFamily: f.family, color: t.p }}>Sync</D></D>
                  <T style={{ fontSize: 12, fontWeight: '600' }}>{f.name}</T>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="Match score">
          <Segmented options={['Number + bars', 'Petals']} value={s.score === 'petals' ? 'Petals' : 'Number + bars'} onChange={(v) => s.setScore(v === 'Petals' ? 'petals' : 'bars')} />
        </Section>

        <View style={{ alignItems: 'center', paddingTop: 8 }}>
          <BandhaniMark size={56} />
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <T style={{ fontSize: 15, fontWeight: '700' }}>{title}</T>
        {note && <T style={{ fontSize: 12.5, color: t.mut, flexShrink: 1, textAlign: 'right' }}>{note}</T>}
      </View>
      {children}
    </View>
  );
}

function HexRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const t = useTheme();
  const [text, setText] = useState(value);
  const shown = validHex(text) || text === value ? text : value;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 6, borderRadius: 12, backgroundColor: t.card }}>
      <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: validHex(shown) ? shown : value, boxShadow: 'inset 0px 0px 0px 1px rgba(0,0,0,0.08)' }} />
      <T style={{ flex: 1, fontSize: 13.5, fontWeight: '600' }}>{label}</T>
      <TextInput
        value={text}
        onFocus={() => setText(value)}
        onChangeText={(v) => {
          const next = v.startsWith('#') ? v : `#${v}`;
          setText(next);
          if (validHex(next)) onChange(next.toUpperCase());
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={7}
        style={{ width: 92, fontSize: 14, fontFamily: isIOS ? 'Menlo' : 'monospace', color: t.ink, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: t.bg }}
      />
    </View>
  );
}
