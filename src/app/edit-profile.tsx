// Edit profile: every field the backend keeps about you, in the order the profile page shows them.
import { router, usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, View } from 'react-native';
import { api, type Me, type ProfileForm } from '../api';
import { Diet, Education, Family, HOBBY_SUGGESTIONS, IncomeAll, LANGUAGE_SUGGESTIONS, Marital, Occupation, Sect, SubSect } from '../api/enums';
import { completeness } from '../api/completeness';
import { heightLabel } from '../api/format';
import { Button, ChipGroup, ProgressBar } from '../components/Controls';
import { DateField, Stepper, TagInput, TextField } from '../components/Form';
import { Icon } from '../components/Icon';
import { FieldLabel, Screen, SectionTitle, StickyFooter } from '../components/Screen';
import { T } from '../components/Text';
import { invalidate, setQueryData, useQuery } from '../lib/query';
import { toast, toastError } from '../lib/stores';
import { useTheme } from '../theme';

export default function EditProfile() {
  const t = useTheme();
  const q = useQuery('profile-form', () => api.getProfileForm());
  const [edited, setEdited] = useState<ProfileForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const f = edited ?? q.data ?? null;
  const dirty = !!edited && !!q.data && JSON.stringify(edited) !== JSON.stringify(q.data);
  const set = (patch: Partial<ProfileForm>) => f && setEdited({ ...f, ...patch });

  const disablePrevention = usePreventRemove(dirty && !leaving && Platform.OS !== 'web', ({ repeat }) => {
    Alert.alert('Discard changes?', "Your edits haven't been saved.", [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { setLeaving(true); repeat(); } },
    ]);
  });

  const nameOk = !!f && f.name.trim().length > 1;
  const save = async () => {
    if (!f || !nameOk) return;
    setBusy(true);
    try {
      const me = await api.saveProfileForm(f);
      setQueryData<Me>('me', () => me);
      setQueryData<ProfileForm>('profile-form', () => f);
      invalidate('me:', 'profile');
      setLeaving(true);
      disablePrevention();
      router.back();
      toast('Profile saved');
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const status = f ? completeness(f) : null;

  return (
    <Screen
      header={{ title: 'Edit profile', back: { label: 'Profile' } }}
      footer={f && (
        <StickyFooter blur={false}>
          <Button label="Save changes" onPress={save} busy={busy} disabled={!dirty || !nameOk} />
        </StickyFooter>
      )}
      contentStyle={{ paddingTop: 8, paddingHorizontal: 20, paddingBottom: 32 }}
    >
      {!f || !status ? (
        q.error ? <T style={{ color: t.mut, marginTop: 32, textAlign: 'center' }}>{q.error.message}</T> : <ActivityIndicator color={t.p} style={{ marginTop: 48 }} />
      ) : (
        <>
          <View accessible accessibilityLabel={`Profile ${status.pct}% complete${status.next ? `. Next: ${status.next}` : ''}`} style={{ marginBottom: 28 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <T style={{ fontSize: 15, fontWeight: '600' }}>{status.pct === 100 ? 'Profile complete' : `${status.pct}% complete`}</T>
              {status.next && <T style={{ fontSize: 13.5, color: t.mut }}>Next: {status.next}</T>}
            </View>
            <ProgressBar value={status.pct} />
          </View>

          <Section title="Basics">
            <TextField label="Full name" value={f.name} onChange={(name) => set({ name })} autoCapitalize="words" hint={nameOk ? undefined : 'Add your name so matches know who you are.'} />
            <DateField label="Date of birth" value={f.dob} onChange={(dob) => set({ dob })} />
            <Choice required label="Marital status" options={Marital.labels} value={f.marital} onChange={(marital) => set({ marital })} />
            <Row>
              <TextField label="City" value={f.city} onChange={(city) => set({ city })} placeholder="Ahmedabad" autoCapitalize="words" />
              <TextField label="State" value={f.state} onChange={(state) => set({ state })} placeholder="Gujarat" autoCapitalize="words" />
            </Row>
          </Section>

          <Section title="Faith & food">
            <Choice required label="Sect" options={Sect.labels} value={f.sect} onChange={(sect) => set({ sect })} />
            <Choice label="Sub-sect" options={SubSect.labels} value={f.subSect} onChange={(subSect) => set({ subSect })} />
            <Choice required label="Diet" options={Diet.labels} value={f.diet} onChange={(diet) => set({ diet })} />
            <Row>
              <TextField label="Gotra" value={f.gotra} onChange={(gotra) => set({ gotra })} autoCapitalize="words" maxLength={120} />
              <TextField label="Native place" value={f.native} onChange={(native) => set({ native })} autoCapitalize="words" maxLength={120} />
            </Row>
            <TextField label="Mosal" value={f.mosal} onChange={(mosal) => set({ mosal })} placeholder="Mother's family, town" autoCapitalize="words" maxLength={120} />
          </Section>

          <Section title="Work">
            <Choice label="Education" options={Education.labels} value={f.education} onChange={(education) => set({ education })} />
            <Choice label="Occupation" options={Occupation.labels} value={f.occupation} onChange={(occupation) => set({ occupation })} />
            <TextField label="Works at" value={f.organization} onChange={(organization) => set({ organization })} placeholder="Company or family business" autoCapitalize="words" />
            <Choice label="Annual income" options={IncomeAll.labels} value={f.income} onChange={(income) => set({ income })} />
          </Section>

          <Section title="Family">
            <Choice label="Family type" options={Family.labels} value={f.family} onChange={(family) => set({ family })} />
            <TextField label="Father's name" value={f.fatherName} onChange={(fatherName) => set({ fatherName })} autoCapitalize="words" maxLength={120} />
            <TextField label="Father's work" value={f.fatherWork} onChange={(fatherWork) => set({ fatherWork })} placeholder="e.g. Textile business" maxLength={120} />
            <TextField label="Mother's name" value={f.motherName} onChange={(motherName) => set({ motherName })} autoCapitalize="words" maxLength={120} />
            <TextField label="Mother's work" value={f.motherWork} onChange={(motherWork) => set({ motherWork })} placeholder="e.g. Teacher, homemaker" maxLength={120} />
            <View>
              <FieldLabel gap={8}>Siblings</FieldLabel>
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Stepper label="Brothers" value={f.brothers} onChange={(brothers) => set({ brothers, marriedBrothers: Math.min(f.marriedBrothers, brothers) })} />
                  <Stepper label="Married" value={f.marriedBrothers} max={f.brothers} onChange={(marriedBrothers) => set({ marriedBrothers })} />
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Stepper label="Sisters" value={f.sisters} onChange={(sisters) => set({ sisters, marriedSisters: Math.min(f.marriedSisters, sisters) })} />
                  <Stepper label="Married" value={f.marriedSisters} max={f.sisters} onChange={(marriedSisters) => set({ marriedSisters })} />
                </View>
              </View>
            </View>
          </Section>

          <Section title="About you">
            <TextField label="About me" value={f.bio} onChange={(bio) => set({ bio })} multiline maxLength={1500}
              placeholder="Your work, your family, what a normal week looks like, what you hope for in a partner." />
            <View>
              <FieldLabel gap={8}>Height</FieldLabel>
              {f.heightCm ? (
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <Stepper label="Height" value={f.heightCm} min={120} max={230} onChange={(heightCm) => set({ heightCm })} format={(v) => `${heightLabel(v)}  ·  ${v} cm`} />
                </View>
              ) : (
                <Pressable onPress={() => set({ heightCm: 165 })} accessibilityRole="button"
                  style={({ pressed }) => ({ height: 48, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: t.outline, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: pressed ? 0.6 : 1 })}>
                  <Icon name="add" size={18} color={t.p} />
                  <T style={{ color: t.p, fontSize: 15, fontWeight: '600' }}>Add height</T>
                </Pressable>
              )}
            </View>
            <TagInput label="Hobbies" values={f.hobbies} onChange={(hobbies) => set({ hobbies })} placeholder="Add a hobby" suggestions={HOBBY_SUGGESTIONS} />
            <TagInput label="Languages" values={f.languages} onChange={(languages) => set({ languages })} placeholder="Add a language" suggestions={LANGUAGE_SUGGESTIONS} max={8} />
          </Section>

          <Section title="Kundli" note="Optional. Shown on your profile only if you add it.">
            <Row>
              <TextField label="Birth time" value={f.tob} onChange={(tob) => set({ tob })} placeholder="e.g. 6:42 AM" maxLength={120} />
              <TextField label="Birth place" value={f.pob} onChange={(pob) => set({ pob })} autoCapitalize="words" maxLength={120} />
            </Row>
          </Section>
        </>
      )}
    </Screen>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 32 }}>
      <SectionTitle style={{ marginLeft: 4, marginBottom: note ? 2 : 14 }}>{title}</SectionTitle>
      {note && <T style={{ fontSize: 13, color: t.mut, marginLeft: 4, marginBottom: 14 }}>{note}</T>}
      <View style={{ gap: 20 }}>{children}</View>
    </View>
  );
}

/** Two fields side by side. */
function Row({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {(Array.isArray(children) ? children : [children]).map((c, i) => <View key={i} style={{ flex: 1, minWidth: 0 }}>{c}</View>)}
    </View>
  );
}

/** Single choice from chips. Tapping the selected chip clears it, unless the field is required. */
function Choice({ label, options, value, onChange, required }: { label: string; options: string[]; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <View>
      <FieldLabel gap={8}>{label}</FieldLabel>
      <ChipGroup options={options} value={value ? [value] : []} multi
        onChange={(v) => { const next = v.filter((x) => x !== value)[0] ?? ''; if (next || !required) onChange(next); }} />
    </View>
  );
}
