// 2d · About you, with 2e · Date of birth (iOS wheel sheet / Android Material calendar dialog).
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { api } from '../../api';
import { Marital } from '../../api/enums';
import { dobLabel, toIsoDate } from '../../api/format';
import { Button, ChipGroup, ProgressBar, Segmented } from '../../components/Controls';
import { Icon } from '../../components/Icon';
import { IosPickerSheet } from '../../components/Overlays';
import { FieldLabel, Screen } from '../../components/Screen';
import { D, T } from '../../components/Text';
import { signOut } from '../../lib/session';
import { isAndroid, isIOS, useTheme } from '../../theme';
import { useOnboarding } from '../../lib/onboarding';

const maxDob = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
};

export default function About() {
  const t = useTheme();
  const o = useOnboarding();
  const [picker, setPicker] = useState(false);
  const [draft, setDraft] = useState<Date>(o.dob ? new Date(o.dob) : new Date(1998, 7, 14));

  // Prefill anything already on the account (e.g. a returning user who didn't finish).
  useEffect(() => {
    api.getMe().then((me) => {
      const s = useOnboarding.getState();
      s.set({
        name: s.name || me.name,
        dob: s.dob ?? me.dob,
        ...(me.gender && { gender: me.gender }),
        ...(me.marital && { marital: me.marital }),
        ...(me.sect && { sect: me.sect }),
        ...(me.subSect && { subSect: me.subSect }),
        ...(me.diet && { diet: me.diet }),
      });
    }).catch(() => {});
  }, []);

  const openDate = () => {
    if (isAndroid) {
      DateTimePickerAndroid.open({
        value: draft,
        mode: 'date',
        design: 'material',
        title: 'Select date',
        maximumDate: maxDob(),
        onValueChange: (_e, d) => {
          setDraft(d);
          o.set({ dob: toIsoDate(d) });
        },
      });
    } else setPicker(true);
  };

  const canContinue = o.name.trim().length > 1 && !!o.dob;

  return (
    <Screen aura fill header={{ back: { label: 'Back', onPress: () => (router.canGoBack() ? router.back() : signOut()) }, clear: true }} contentStyle={{ paddingTop: 8, paddingHorizontal: 24, paddingBottom: 20 }}>
      <View style={{ marginBottom: 22 }}><ProgressBar value={50} /></View>
      <D accessibilityRole="header" style={{ color: t.p, fontSize: 34, lineHeight: 40, marginBottom: 24 }}>About you</D>

      {isIOS ? (
        <>
          <FieldLabel>Name</FieldLabel>
          <TextInput value={o.name} onChangeText={(name) => o.set({ name })} textContentType="name" autoComplete="name" accessibilityLabel="Name" selectionColor={t.p}
            style={{ height: 50, borderRadius: t.fieldR, backgroundColor: t.s, paddingHorizontal: 16, fontSize: 17, color: t.ink, marginBottom: 22, boxShadow: t.cardShadow }} />
        </>
      ) : (
        <View style={{ marginBottom: 22 }}>
          <TextInput value={o.name} onChangeText={(name) => o.set({ name })} autoComplete="name" accessibilityLabel="Name" selectionColor={t.p}
            style={{ height: 56, borderRadius: 4, borderWidth: 1, borderColor: t.outline, paddingHorizontal: 16, fontSize: 16, color: t.ink }} />
          <T style={{ position: 'absolute', top: -9, left: 10, paddingHorizontal: 4, backgroundColor: t.bg, fontSize: 12, color: t.mut }}>Name</T>
        </View>
      )}

      <FieldLabel>I am</FieldLabel>
      <View style={{ marginBottom: 22 }}><Segmented options={['Man', 'Woman']} value={o.gender} onChange={(gender) => o.set({ gender })} /></View>

      <FieldLabel>Date of birth</FieldLabel>
      <Pressable onPress={openDate} accessibilityRole="button" accessibilityLabel={`Date of birth, ${o.dob ? dobLabel(o.dob) : 'not set'}`}
        style={{ height: 52, borderRadius: t.fieldR, borderWidth: isAndroid ? 1 : 0, borderColor: t.outline, backgroundColor: isAndroid ? 'transparent' : t.s, boxShadow: t.cardShadow, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <T style={{ fontSize: 16, color: o.dob ? t.ink : t.mut }}>{o.dob ? dobLabel(o.dob) : 'Select'}</T>
        <Icon name="calendar_month" size={22} color={t.p} />
      </Pressable>

      <FieldLabel gap={8}>Marital status</FieldLabel>
      <ChipGroup options={Marital.labels} value={[o.marital]} onChange={([marital]) => o.set({ marital })} />

      <View style={{ flex: 1, minHeight: 24 }} />
      <Button label="Continue" onPress={() => router.push('/onboarding/faith')} disabled={!canContinue} />

      {isIOS && (
        <IosPickerSheet open={picker} title="Date of birth" onClose={() => setPicker(false)} onDone={() => { o.set({ dob: toIsoDate(draft) }); setPicker(false); }}>
          <DateTimePicker value={draft} mode="date" display="spinner" maximumDate={maxDob()} textColor={t.ink} themeVariant={t.dark ? 'dark' : 'light'} onValueChange={(_e, d) => setDraft(d)} style={{ height: 216 }} />
        </IosPickerSheet>
      )}
    </Screen>
  );
}
