// Form fields for Edit profile, styled like the onboarding fields:
// iOS: filled field with the label above. Android: Material outlined field with a floating label.
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { dobLabel, toIsoDate } from '../api/format';
import { isAndroid, isIOS, mix, useTheme } from '../theme';
import { Icon } from './Icon';
import { IosPickerSheet } from './Overlays';
import { FieldLabel } from './Screen';
import { T } from './Text';

const web = Platform.OS === 'web';

export function TextField({
  label, value, onChange, placeholder, multiline, maxLength, keyboardType, autoCapitalize = 'sentences', hint,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; maxLength?: number;
  keyboardType?: KeyboardTypeOptions; autoCapitalize?: 'none' | 'sentences' | 'words'; hint?: string;
}) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const height = multiline ? 120 : isIOS ? 50 : 56;
  const counter = multiline && maxLength ? `${value.length}/${maxLength}` : null;
  const input = (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={t.mut}
      multiline={multiline}
      maxLength={maxLength}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      accessibilityLabel={label}
      selectionColor={t.p}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      textAlignVertical={multiline ? 'top' : 'center'}
      style={[
        { minHeight: height, paddingHorizontal: 16, fontSize: isIOS ? 17 : 16, color: t.ink, outlineStyle: 'none' } as object,
        multiline && { paddingTop: 14, paddingBottom: 14, lineHeight: 22 },
        isIOS
          ? { borderRadius: t.fieldR, backgroundColor: t.s, boxShadow: t.cardShadow }
          : { borderRadius: 4, borderWidth: focused ? 2 : 1, borderColor: focused ? t.p : t.outline, paddingHorizontal: focused ? 15 : 16 },
      ]}
    />
  );
  const foot = (hint || counter) && (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 6, marginHorizontal: 4 }}>
      <T style={{ flex: 1, fontSize: 12.5, color: t.mut }}>{hint ?? ''}</T>
      {counter && <T style={{ fontSize: 12.5, color: t.mut, fontVariant: ['tabular-nums'] }}>{counter}</T>}
    </View>
  );
  if (isIOS) {
    return (
      <View>
        <FieldLabel>{label}</FieldLabel>
        {input}
        {foot}
      </View>
    );
  }
  return (
    <View>
      <View>
        {input}
        <T style={{ position: 'absolute', top: -9, left: 10, paddingHorizontal: 4, backgroundColor: t.bg, fontSize: 12, color: focused ? t.p : t.mut }}>{label}</T>
      </View>
      {foot}
    </View>
  );
}

/** − value + control, in the same tonal card as the age steppers on Preferences. */
export function Stepper({
  label, value, onChange, min = 0, max = 15, format,
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; format?: (v: number) => string }) {
  const t = useTheme();
  const btn = (d: -1 | 1) => {
    const off = d < 0 ? value <= min : value >= max;
    return (
      <Pressable
        onPress={off ? undefined : () => onChange(value + d)}
        accessibilityRole="button"
        accessibilityLabel={`${d < 0 ? 'Fewer' : 'More'} ${label.toLowerCase()}`}
        accessibilityState={{ disabled: off }}
        style={({ pressed }) => ({ width: 44, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', opacity: off ? 0.35 : pressed ? 0.6 : 1 })}
      >
        <Icon name={d < 0 ? 'remove' : 'add'} size={20} color={t.p} />
      </Pressable>
    );
  };
  return (
    <View accessible={false} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 4, borderRadius: 14, backgroundColor: t.card, boxShadow: isIOS ? t.cardShadow : undefined }}>
      {btn(-1)}
      <View style={{ alignItems: 'center', minWidth: 0, flexShrink: 1 }}>
        <T style={{ fontSize: 12, color: t.mut }}>{label}</T>
        <T style={{ fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] }} accessibilityLiveRegion="polite">{format ? format(value) : value}</T>
      </View>
      {btn(1)}
    </View>
  );
}

/**
 * A short list of words (hobbies, languages): removable chips, an add field,
 * and one-tap suggestions. Commas are stripped because the backend splits on them.
 */
export function TagInput({
  label, values, onChange, placeholder, suggestions = [], max = 12,
}: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string; suggestions?: string[]; max?: number }) {
  const t = useTheme();
  const [draft, setDraft] = useState('');
  const has = (v: string) => values.some((x) => x.toLowerCase() === v.toLowerCase());
  const add = (raw: string) => {
    const v = raw.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    if (!v || has(v) || values.length >= max) return;
    onChange([...values, v.slice(0, 40)]);
  };
  const submit = () => {
    add(draft);
    setDraft('');
  };
  const open = suggestions.filter((s) => !has(s));
  const full = values.length >= max;
  return (
    <View>
      <FieldLabel gap={8}>{label}</FieldLabel>
      {values.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {values.map((v) => (
            <View key={v} style={{ flexDirection: 'row', alignItems: 'center', height: 34, paddingLeft: 12, paddingRight: 4, borderRadius: t.chipR, backgroundColor: isAndroid ? mix(t.p, 18, t.s) : t.soft }}>
              <T style={{ fontSize: 14, fontWeight: '500', color: isAndroid ? t.ink : t.p }}>{v}</T>
              <Pressable onPress={() => onChange(values.filter((x) => x !== v))} accessibilityRole="button" accessibilityLabel={`Remove ${v}`} hitSlop={6}
                style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={16} color={isAndroid ? t.ink : t.p} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      {!full && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submit}
            submitBehavior="submit"
            returnKeyType="done"
            placeholder={placeholder}
            placeholderTextColor={t.mut}
            accessibilityLabel={`Add to ${label.toLowerCase()}`}
            selectionColor={t.p}
            maxLength={40}
            style={[
              { flex: 1, height: 44, paddingHorizontal: 14, fontSize: 15.5, color: t.ink, outlineStyle: 'none' } as object,
              isIOS ? { borderRadius: t.fieldR, backgroundColor: t.s, boxShadow: t.cardShadow } : { borderRadius: 4, borderWidth: 1, borderColor: t.outline },
            ]}
          />
          <Pressable onPress={submit} disabled={!draft.trim()} accessibilityRole="button" accessibilityLabel={`Add ${draft || 'item'}`}
            style={({ pressed }) => ({ height: 44, paddingHorizontal: 16, borderRadius: t.btnR, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center', opacity: !draft.trim() ? 0.45 : pressed ? 0.7 : 1 })}>
            <T style={{ color: t.p, fontSize: 15, fontWeight: '600' }}>Add</T>
          </Pressable>
        </View>
      )}
      {!full && open.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {open.slice(0, 6).map((s) => (
            <Pressable key={s} onPress={() => add(s)} accessibilityRole="button" accessibilityLabel={`Add ${s}`}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 2, height: 30, paddingLeft: 8, paddingRight: 12, borderRadius: t.chipR, borderWidth: 1, borderStyle: 'dashed', borderColor: t.outline, opacity: pressed ? 0.6 : 1 })}>
              <Icon name="add" size={16} color={t.mut} />
              <T style={{ fontSize: 13.5, color: t.mut }}>{s}</T>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function maxDob() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
}

/** Date of birth: Android's calendar dialog, an iOS wheel sheet, or a plain field on web previews. */
export function DateField({ label, value, onChange }: { label: string; value: string | null; onChange: (iso: string) => void }) {
  const t = useTheme();
  const [sheet, setSheet] = useState(false);
  const [draft, setDraft] = useState<Date>(value ? new Date(value) : new Date(1997, 0, 1));
  if (web) {
    return <TextField label={label} value={value ?? ''} onChange={(v) => /^\d{0,4}(-\d{0,2}){0,2}$/.test(v) && onChange(v)} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />;
  }
  const open = () => {
    const start = value ? new Date(value) : draft;
    setDraft(start);
    if (isAndroid) {
      DateTimePickerAndroid.open({ value: start, mode: 'date', maximumDate: maxDob(), onValueChange: (_e, d) => onChange(toIsoDate(d)) });
    } else setSheet(true);
  };
  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`${label}, ${value ? dobLabel(value) : 'not set'}`}
        style={{ height: isIOS ? 50 : 56, borderRadius: t.fieldR, borderWidth: isAndroid ? 1 : 0, borderColor: t.outline, backgroundColor: isAndroid ? 'transparent' : t.s, boxShadow: t.cardShadow, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T style={{ fontSize: 16, color: value ? t.ink : t.mut }}>{value ? dobLabel(value) : 'Select'}</T>
        <Icon name="calendar_month" size={22} color={t.p} />
      </Pressable>
      {isIOS && (
        <IosPickerSheet open={sheet} title={label} onClose={() => setSheet(false)} onDone={() => { onChange(toIsoDate(draft)); setSheet(false); }}>
          <DateTimePicker value={draft} mode="date" display="spinner" maximumDate={maxDob()} textColor={t.ink} themeVariant={t.dark ? 'dark' : 'light'} onValueChange={(_e, d) => setDraft(d)} style={{ height: 216 }} />
        </IosPickerSheet>
      )}
    </View>
  );
}
