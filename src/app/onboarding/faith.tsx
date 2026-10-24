// 2f · Faith & food. Saves the whole profile, then opens the matches feed.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '../../api';
import { DIET_INFO, Diet, Sect, SubSect } from '../../api/enums';
import { Button, ChipGroup, ProgressBar } from '../../components/Controls';
import { Icon } from '../../components/Icon';
import { FieldLabel, Screen } from '../../components/Screen';
import { D, T } from '../../components/Text';
import { invalidate } from '../../lib/query';
import { toast, toastError, useSession } from '../../lib/stores';
import { useTheme } from '../../theme';
import { useOnboarding } from '../../lib/onboarding';

export default function Faith() {
  const t = useTheme();
  const o = useOnboarding();
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    setBusy(true);
    try {
      const { name, gender, dob, marital, sect, subSect, diet } = useOnboarding.getState();
      await api.updateMe({ name: name.trim(), gender, dob, marital, sect, subSect, diet });
      useSession.getState().set({ status: 'signedIn' });
      invalidate('');
      router.dismissAll();
      router.replace('/matches');
      const n = (await api.matches('All').catch(() => [])).length;
      toast(n ? `${n} new match${n === 1 ? '' : 'es'} for you` : 'Your profile is ready', 'local_florist');
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen aura fill header={{ back: { label: 'Back' }, clear: true }} contentStyle={{ paddingTop: 8, paddingHorizontal: 24, paddingBottom: 20 }}>
      <View style={{ marginBottom: 22 }}><ProgressBar value={100} /></View>
      <D accessibilityRole="header" style={{ color: t.p, fontSize: 34, lineHeight: 40, marginBottom: 24 }}>Faith &amp; food</D>

      <FieldLabel gap={8}>Sect</FieldLabel>
      <View style={{ marginBottom: 22 }}><ChipGroup options={Sect.labels} value={[o.sect]} onChange={([sect]) => o.set({ sect })} /></View>

      <FieldLabel gap={8}>Sub-sect</FieldLabel>
      <View style={{ marginBottom: 22 }}><ChipGroup options={SubSect.labels} value={[o.subSect]} onChange={([subSect]) => o.set({ subSect })} /></View>

      <FieldLabel gap={8}>Diet</FieldLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {Diet.labels.map((d) => {
          const on = o.diet === d;
          return (
            <Pressable key={d} onPress={() => o.set({ diet: d })} accessibilityRole="radio" accessibilityState={{ checked: on }}
              style={{ width: '48.5%', flexGrow: 1, flexBasis: '45%', gap: 4, padding: 14, borderRadius: 16, borderWidth: 2, borderColor: on ? t.p : 'transparent', backgroundColor: on ? t.soft : t.card }}>
              <Icon name={DIET_INFO[d]!.icon as 'eco'} size={24} color={t.p} />
              <T style={{ fontSize: 15, fontWeight: '600', marginTop: 4 }}>{d}</T>
              <T style={{ fontSize: 12.5, lineHeight: 17, color: t.mut }}>{DIET_INFO[d]!.desc}</T>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1, minHeight: 24 }} />
      <Button label="Show my matches" onPress={finish} busy={busy} />
    </Screen>
  );
}
