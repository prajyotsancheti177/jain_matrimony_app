// Onboarding: 8 short steps after phone + OTP. Steps 1–4 are needed for matching; 5–8 can be skipped.
// Each question group is a card like the Preferences screen: icon tile, title, current answer in teal.
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, BackHandler, Image, Pressable, View, type ScrollViewInstance } from 'react-native';
import { api } from '../../api';
import { DIET_INFO, Diet, Education, Marital, Occupation, Sect, SubSect } from '../../api/enums';
import { dobLabel, heightLabel, toIsoDate } from '../../api/format';
import { Button, Chip } from '../../components/Controls';
import { TextField } from '../../components/Form';
import { Icon, type IconName } from '../../components/Icon';
import { IosPickerSheet } from '../../components/Overlays';
import { Card, Screen } from '../../components/Screen';
import { D, T } from '../../components/Text';
import { useOnboarding } from '../../lib/onboarding';
import { invalidate } from '../../lib/query';
import { signOut } from '../../lib/session';
import { toast, toastError, useSession } from '../../lib/stores';
import { isAndroid, isIOS, mix, useTheme } from '../../theme';

type StepKey = 'name' | 'birth' | 'photos' | 'faith' | 'work' | 'more' | 'family' | 'saakha';
const STEPS: { k: StepKey; title: string; lede: string; icon: IconName; required?: boolean }[] = [
  { k: 'name', title: "What's your name?", lede: 'As families know you. Only your first name shows until you match.', icon: 'badge', required: true },
  { k: 'birth', title: 'Birthday & places', lede: 'Used for age and to find matches near you.', icon: 'cake', required: true },
  { k: 'photos', title: 'Add your photos', lede: 'Profiles with a photo get noticed first.', icon: 'add_a_photo', required: true },
  { k: 'faith', title: 'Faith & food', lede: 'Matches are ranked on these first.', icon: 'self_improvement', required: true },
  { k: 'work', title: 'Education & work', lede: 'Your highest qualification and what you do.', icon: 'school' },
  { k: 'more', title: 'A bit more about you', lede: 'Two quick ones.', icon: 'height' },
  { k: 'family', title: 'Your family', lede: 'Names help elders place your family. Fill what you know.', icon: 'family_restroom' },
  { k: 'saakha', title: 'Saakha', lede: 'Families check these to avoid the same saakha. Fill what you know.', icon: 'account_tree' },
];
const SHORT: Record<StepKey, string> = {
  name: 'Your name', birth: 'Birthday & places', photos: 'Photos', faith: 'Faith & food',
  work: 'Education & work', more: 'Height & blood group', family: 'Family', saakha: 'Saakha',
};
const BLOOD = ['A+', 'A−', 'B+', 'B−', 'O+', 'O−', 'AB+', 'AB−'];
const MAX_EXTRA = 5;

const maxDob = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
};

export default function Onboarding() {
  const t = useTheme();
  const o = useOnboarding();
  const [i, setI] = useState(0);
  const [skipped, setSkipped] = useState<StepKey[]>([]);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [extras, setExtras] = useState<string[]>([]);
  const [uploading, setUploading] = useState<'profile' | 'extra' | null>(null);
  const [locating, setLocating] = useState(false);
  const [located, setLocated] = useState(false);
  const [picker, setPicker] = useState(false);
  const [draft, setDraft] = useState<Date>(o.dob ? new Date(o.dob) : new Date(1998, 7, 14));
  const scroll = useRef<ScrollViewInstance>(null);

  // Prefill anything already on the account (e.g. a returning user who didn't finish).
  useEffect(() => {
    api.getOnboarding().then((saved) => {
      const s = useOnboarding.getState();
      const keep = Object.fromEntries(Object.entries(saved).filter(([k, v]) => v !== '' && v !== null && !s[k as keyof typeof s]));
      s.set(keep);
    }).catch(() => {});
    api.getMe().then((me) => {
      setPhoto(me.profilePhoto);
      setExtras(me.photos);
    }).catch(() => {});
  }, []);

  const step = STEPS[i]!;
  const go = (n: number) => {
    setI(n);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const back = () => {
    if (done) setDone(false);
    else if (i > 0) go(i - 1);
    else if (router.canGoBack()) router.back();
    else signOut();
    return true;
  };

  // Android's back button walks back through the steps instead of leaving onboarding.
  useEffect(() => {
    if (!isAndroid) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', back);
    return () => sub.remove();
  });

  const valid: Record<StepKey, boolean> = {
    name: o.first.trim().length > 1 && o.middle.trim().length > 0 && o.last.trim().length > 0 && !!o.gender,
    birth: !!o.dob && o.city.trim().length > 1,
    photos: !!photo,
    faith: !!o.sect && !!o.diet,
    work: true, more: true, family: true, saakha: true,
  };

  const save = async () => {
    setBusy(true);
    try {
      await api.saveOnboarding(useOnboarding.getState());
      return true;
    } catch (e) {
      toastError(e);
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Saved once the required steps are in (so leaving halfway still leaves a usable profile), and at the end.
  const next = async (skip = false) => {
    if (skip) setSkipped((l) => [...new Set([...l, step.k])]);
    else setSkipped((l) => l.filter((k) => k !== step.k));
    if (step.k === 'faith' && !(await save())) return;
    if (i === STEPS.length - 1) {
      if (await save()) setDone(true);
      return;
    }
    go(i + 1);
  };

  const finish = () => {
    useSession.getState().set({ status: 'signedIn' });
    invalidate('');
    router.dismissAll();
    router.replace('/matches');
    toast('Your profile is ready', 'local_florist');
  };

  const openDate = () => {
    const start = o.dob ? new Date(o.dob) : draft;
    setDraft(start);
    if (isAndroid) {
      DateTimePickerAndroid.open({ value: start, mode: 'date', maximumDate: maxDob(), onValueChange: (_e, d) => { setDraft(d); o.set({ dob: toIsoDate(d) }); } });
    } else setPicker(true);
  };

  const useLocation = async () => {
    setLocating(true);
    try {
      if (api.demo) {
        await new Promise((r) => setTimeout(r, 700));
        o.set({ city: 'Ahmedabad', state: 'Gujarat' });
        setLocated(true);
        return;
      }
      // Load the location module only when asked, so a missing native module can't take down onboarding.
      const Location = await import('expo-location');
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        toast('Location is off. Type your city instead.', 'location_on');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync(pos.coords);
      const city = place?.city ?? place?.subregion ?? place?.district ?? '';
      if (!city) {
        toast("Couldn't find your city. Type it instead.", 'location_on');
        return;
      }
      o.set({ city, state: place?.region ?? o.state });
      setLocated(true);
    } catch {
      toast("Couldn't get your location. Type your city instead.", 'location_on');
    } finally {
      setLocating(false);
    }
  };

  const addPhoto = async (kind: 'profile' | 'extra') => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 0.85 });
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    setUploading(kind);
    try {
      const url = await api.uploadPhoto({ uri: a.uri, name: a.fileName ?? 'photo.jpg', mimeType: a.mimeType ?? 'image/jpeg' }, kind);
      if (kind === 'profile') {
        await api.updateMe({ profilePhoto: url });
        setPhoto(url);
      } else {
        const list = [...extras, url];
        await api.updateMe({ photos: list });
        setExtras(list);
      }
    } catch (e) {
      toastError(e);
    } finally {
      setUploading(null);
    }
  };

  const chips = (options: string[], value: string, onPick: (v: string) => void, allowClear = true) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((v) => <Chip key={v} label={v} on={value === v} onPress={() => onPick(allowClear && value === v ? '' : v)} />)}
    </View>
  );
  const name = [o.first, o.middle, o.last].map((x) => x.trim()).filter(Boolean).join(' ');
  const joined = (...v: string[]) => v.map((x) => x.trim()).filter(Boolean).join(', ');

  const body = (): ReactNode => {
    switch (step.k) {
      case 'name':
        return (
          <>
            <QCard icon="badge" title="Full name" value={name}>
              <TextField label="First name" value={o.first} onChange={(first) => o.set({ first })} autoCapitalize="words" />
              <TextField label="Middle name" value={o.middle} onChange={(middle) => o.set({ middle })} autoCapitalize="words" hint="Usually your father's name, e.g. Rajeshbhai." />
              <TextField label="Last name" value={o.last} onChange={(last) => o.set({ last })} autoCapitalize="words" />
            </QCard>
            <QCard icon="wc" title="I am" value={o.gender}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(['Man', 'Woman'] as const).map((g) => {
                  const on = o.gender === g;
                  return (
                    <Pressable key={g} onPress={() => o.set({ gender: g })} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={g}
                      style={({ pressed }) => ({ flex: 1, height: 96, borderRadius: 16, borderWidth: on ? 2 : 1.5, borderColor: on ? t.p : t.line, backgroundColor: on ? mix(t.p, 10, t.bg) : t.bg, alignItems: 'center', justifyContent: 'center', gap: 6, opacity: pressed ? 0.8 : 1 })}>
                      <Icon name={g === 'Man' ? 'man' : 'woman'} size={38} color={on ? t.p : t.mut} />
                      <T style={{ fontSize: 15, fontWeight: '600' }}>{g}</T>
                      {on && <View style={{ position: 'absolute', top: 8, right: 8 }}><Icon name="check_circle" size={20} color={t.p} fill /></View>}
                    </Pressable>
                  );
                })}
              </View>
            </QCard>
            <QCard icon="favorite" title="Marital status" value={o.marital}>
              {chips(Marital.labels, o.marital, (marital) => o.set({ marital: marital || o.marital }), false)}
            </QCard>
          </>
        );
      case 'birth':
        return (
          <>
            <QCard icon="cake" title="Date of birth" value={o.dob ? dobLabel(o.dob) : ''}>
              <Pressable onPress={openDate} accessibilityRole="button" accessibilityLabel={`Date of birth, ${o.dob ? dobLabel(o.dob) : 'not set'}`}
                style={{ height: 52, borderRadius: t.fieldR, borderWidth: isAndroid ? 1 : 0, borderColor: t.outline, backgroundColor: isAndroid ? 'transparent' : t.bg, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <T style={{ fontSize: 16, color: o.dob ? t.ink : t.mut }}>{o.dob ? dobLabel(o.dob) : 'Select'}</T>
                <Icon name="calendar_month" size={22} color={t.p} />
              </Pressable>
            </QCard>
            <QCard icon="location_on" title="Where you live now" value={joined(o.city, o.state)}>
              <Pressable onPress={useLocation} disabled={locating} accessibilityRole="button"
                style={({ pressed }) => ({ height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: t.p, backgroundColor: t.s, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: locating ? 0.7 : pressed ? 0.8 : 1 })}>
                {locating ? <ActivityIndicator color={t.p} size="small" /> : <Icon name={located ? 'check_circle' : 'my_location'} size={20} color={t.p} />}
                <T style={{ color: t.p, fontSize: 15, fontWeight: '600' }}>{locating ? 'Finding you…' : located ? 'Using your current location' : 'Use my current location'}</T>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1.2, minWidth: 0 }}><TextField label="City" value={o.city} onChange={(city) => { o.set({ city }); setLocated(false); }} autoCapitalize="words" /></View>
                <View style={{ flex: 1, minWidth: 0 }}><TextField label="State" value={o.state} onChange={(state) => o.set({ state })} autoCapitalize="words" /></View>
              </View>
              <Hint>We only save the city and state, never your exact location.</Hint>
            </QCard>
            <QCard icon="home" title="Hometown" value={o.hometown}>
              <TextField label="Native place" value={o.hometown} onChange={(hometown) => o.set({ hometown })} autoCapitalize="words" hint="Where your family is originally from, e.g. Palitana." />
            </QCard>
          </>
        );
      case 'photos':
        return (
          <QCard icon="add_a_photo" title="Photos" value={photo ? `Profile photo${extras.length ? ` + ${extras.length} more` : ''}` : ''}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <PhotoTile big uri={photo} busy={uploading === 'profile'} label={photo ? 'Change' : 'Add profile photo'} badge="Profile photo" onPress={() => addPhoto('profile')} />
              <View style={{ flex: 1, gap: 10 }}>
                {[0, 1].map((n) => <PhotoTile key={n} uri={extras[n]} busy={uploading === 'extra' && extras.length === n} label="Extra" onPress={extras[n] ? undefined : () => addPhoto('extra')} />)}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[2, 3, 4].map((n) => <PhotoTile key={n} uri={extras[n]} busy={uploading === 'extra' && extras.length === n} label="Extra" onPress={extras[n] || extras.length < n || extras.length >= MAX_EXTRA ? undefined : () => addPhoto('extra')} />)}
            </View>
            <Note icon="lock">Your profile photo is visible to everyone. Extra photos are private: people ask, and you choose who sees them.</Note>
          </QCard>
        );
      case 'faith':
        return (
          <>
            <QCard icon="self_improvement" title="Sect" value={o.sect}>{chips(Sect.labels, o.sect, (sect) => o.set({ sect: sect || o.sect }), false)}</QCard>
            <QCard icon="account_tree" title="Sub-sect" value={o.subSect}>{chips(SubSect.labels, o.subSect, (subSect) => o.set({ subSect }))}</QCard>
            <QCard icon="eco" title="Diet" value={o.diet}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {Diet.labels.map((d) => {
                  const on = o.diet === d;
                  return (
                    <Pressable key={d} onPress={() => o.set({ diet: d })} accessibilityRole="radio" accessibilityState={{ checked: on }}
                      style={{ flexGrow: 1, flexBasis: '45%', gap: 2, padding: 12, borderRadius: 14, borderWidth: on ? 2 : 1, borderColor: on ? t.p : t.line, backgroundColor: on ? mix(t.p, 10, t.bg) : t.bg }}>
                      <Icon name={DIET_INFO[d]!.icon as IconName} size={22} color={t.p} />
                      <T style={{ fontSize: 15, fontWeight: '600', marginTop: 4 }}>{d}</T>
                      <T style={{ fontSize: 12.5, lineHeight: 17, color: t.mut }}>{DIET_INFO[d]!.desc}</T>
                    </Pressable>
                  );
                })}
              </View>
            </QCard>
          </>
        );
      case 'work':
        return (
          <>
            <QCard icon="school" title="Education" value={o.education} optional>{chips(Education.labels, o.education, (education) => o.set({ education }))}</QCard>
            <QCard icon="work" title="Work" value={o.occupation} optional>{chips(Occupation.labels, o.occupation, (occupation) => o.set({ occupation }))}</QCard>
          </>
        );
      case 'more': {
        const h = o.heightCm;
        const nudge = (d: number) => o.set({ heightCm: Math.max(130, Math.min(215, (h ?? 165) + d)) });
        return (
          <>
            <QCard icon="height" title="Height" value={h ? `${heightLabel(h)} · ${h} cm` : ''} optional>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderRadius: 16, backgroundColor: t.bg }}>
                <Pressable onPress={() => nudge(-1)} accessibilityRole="button" accessibilityLabel="Shorter"
                  style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 14, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
                  <Icon name="remove" size={22} color={t.p} />
                </Pressable>
                <View style={{ alignItems: 'center' }} accessibilityLiveRegion="polite">
                  <D style={{ color: t.p, fontSize: 28, lineHeight: 34 }}>{h ? heightLabel(h) : '—'}</D>
                  <T style={{ fontSize: 12.5, color: t.mut }}>{h ? `${h} cm` : 'Tap + or −'}</T>
                </View>
                <Pressable onPress={() => nudge(1)} accessibilityRole="button" accessibilityLabel="Taller"
                  style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 14, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
                  <Icon name="add" size={22} color={t.p} />
                </Pressable>
              </View>
            </QCard>
            <QCard icon="bloodtype" title="Blood group" value={o.bloodGroup} optional>
              {chips(BLOOD, o.bloodGroup, (bloodGroup) => o.set({ bloodGroup }))}
              <Hint>Some families like to know.</Hint>
            </QCard>
          </>
        );
      }
      case 'family':
        return (
          <>
            <QCard icon="family_restroom" title="Parents" value={joined(o.father, o.mother)} optional>
              <TextField label="Father's name" value={o.father} onChange={(father) => o.set({ father })} autoCapitalize="words" />
              <TextField label="Mother's name" value={o.mother} onChange={(mother) => o.set({ mother })} autoCapitalize="words" />
            </QCard>
            <QCard icon="elderly" title="Father's side" value={joined(o.dadaji, o.dadiji)} optional>
              <TextField label="Grandfather (Dadaji)" value={o.dadaji} onChange={(dadaji) => o.set({ dadaji })} autoCapitalize="words" />
              <TextField label="Grandmother (Dadiji)" value={o.dadiji} onChange={(dadiji) => o.set({ dadiji })} autoCapitalize="words" />
            </QCard>
            <QCard icon="elderly_woman" title="Mother's side" value={joined(o.nanaji, o.naniji)} optional>
              <TextField label="Grandfather (Nanaji)" value={o.nanaji} onChange={(nanaji) => o.set({ nanaji })} autoCapitalize="words" />
              <TextField label="Grandmother (Naniji)" value={o.naniji} onChange={(naniji) => o.set({ naniji })} autoCapitalize="words" />
            </QCard>
          </>
        );
      case 'saakha': {
        const rows: [keyof typeof o & ('saakha' | 'dadiSaakha' | 'naniSaakha' | 'mamaSaakha'), string, string, IconName][] = [
          ['saakha', 'Self', 'Your own', 'person'],
          ['dadiSaakha', 'Daadiji', "Father's mother", 'elderly_woman'],
          ['naniSaakha', 'Naaniji', "Mother's mother", 'elderly_woman'],
          ['mamaSaakha', 'Maamaji', "Mother's brother", 'man'],
        ];
        return (
          <QCard icon="account_tree" title="Saakha" value={joined(o.saakha, o.dadiSaakha, o.naniSaakha, o.mamaSaakha)} optional>
            {rows.map(([k, who, desc, icon]) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 92, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name={icon} size={20} color={t.p} />
                  <View style={{ flexShrink: 1 }}>
                    <T style={{ fontSize: 14.5, fontWeight: '600' }}>{who}</T>
                    <T style={{ fontSize: 11.5, color: t.mut }}>{desc}</T>
                  </View>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}><TextField label={`${who} saakha`} value={o[k]} onChange={(v) => o.set({ [k]: v })} autoCapitalize="words" /></View>
              </View>
            ))}
            <Note icon="visibility">Shown on your profile to people you match with.</Note>
          </QCard>
        );
      }
    }
  };

  if (done) {
    return (
      <Screen aura fill header={{ back: { label: 'Back', onPress: back }, clear: true }} contentStyle={{ paddingTop: 8, paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundImage: `linear-gradient(160deg, ${t.g1}, ${t.g2})`, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="favorite" size={46} color={t.p} fill />
          </View>
          <D accessibilityRole="header" style={{ color: t.p, fontSize: 30, lineHeight: 36, marginTop: 18 }}>Your profile is ready</D>
          <T style={{ fontSize: 15, color: t.mut, marginTop: 4, textAlign: 'center' }}>You can add anything you skipped from Edit profile.</T>
        </View>
        <Card style={{ padding: 0, marginTop: 22, overflow: 'hidden' }}>
          {STEPS.map((s, n) => {
            const skip = skipped.includes(s.k);
            return (
              <View key={s.k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderTopWidth: n ? 1 : 0, borderColor: t.line }}>
                <Tile icon={s.icon} />
                <View style={{ flex: 1 }}>
                  <T style={{ fontSize: 15, fontWeight: '600' }}>{SHORT[s.k]}</T>
                  <T style={{ fontSize: 13, color: skip ? t.mut : t.p, fontWeight: skip ? '400' : '500' }}>{skip ? 'Skipped · add later' : 'Done'}</T>
                </View>
                {!skip && <Icon name="check_circle" size={22} color={t.p} fill />}
              </View>
            );
          })}
        </Card>
        <View style={{ flex: 1, minHeight: 24 }} />
        <Button label="Show my matches" iconRight="arrow_forward" onPress={finish} />
      </Screen>
    );
  }

  return (
    <Screen aura fill scrollRef={scroll} header={{ back: { label: 'Back', onPress: back }, clear: true }}
      contentStyle={{ paddingTop: 4, paddingHorizontal: 20, paddingBottom: 20 }}>
      <View style={{ flexDirection: 'row', gap: 4, marginHorizontal: 4 }} accessible accessibilityLabel={`Step ${i + 1} of ${STEPS.length}`}>
        {STEPS.map((s, n) => (
          <View key={s.k} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: n < i ? t.p : n === i ? undefined : mix(t.p, 16, t.bg), backgroundImage: n === i ? t.accentBar : undefined }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40, marginTop: 6, marginHorizontal: 4 }}>
        <T style={{ fontSize: 13, fontWeight: '600', color: t.mut }}>Step {i + 1} of {STEPS.length}{step.required ? '' : ' · optional'}</T>
        {!step.required && (
          <Pressable onPress={() => next(true)} accessibilityRole="button" hitSlop={8} style={({ pressed }) => ({ height: 40, paddingHorizontal: 6, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
            <T style={{ fontSize: 14.5, fontWeight: '600', color: t.p }}>Skip for now</T>
          </Pressable>
        )}
      </View>
      <D accessibilityRole="header" style={{ color: t.p, fontSize: 30, lineHeight: 36, marginTop: 2, marginHorizontal: 4 }}>{step.title}</D>
      <T style={{ fontSize: 15, lineHeight: 22, color: t.mut, marginTop: 4, marginBottom: 6, marginHorizontal: 4 }}>{step.lede}</T>

      <View style={{ gap: 10 }}>{body()}</View>

      <View style={{ flex: 1, minHeight: 24 }} />
      <Button label={i === STEPS.length - 1 ? 'Finish' : 'Continue'} onPress={() => next()} disabled={!valid[step.k] || !!uploading} busy={busy} />

      {isIOS && (
        <IosPickerSheet open={picker} title="Date of birth" onClose={() => setPicker(false)} onDone={() => { o.set({ dob: toIsoDate(draft) }); setPicker(false); }}>
          <DateTimePicker value={draft} mode="date" display="spinner" maximumDate={maxDob()} textColor={t.ink} themeVariant={t.dark ? 'dark' : 'light'} onValueChange={(_e, d) => setDraft(d)} style={{ height: 216 }} />
        </IosPickerSheet>
      )}
    </Screen>
  );
}

function Tile({ icon }: { icon: IconName }) {
  const t = useTheme();
  return (
    <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={20} color={t.p} />
    </View>
  );
}

/** A question group: icon tile, title, the current answer in teal (like a Preferences card), and its fields. */
function QCard({ icon, title, value, optional, children }: { icon: IconName; title: string; value: string; optional?: boolean; children: ReactNode }) {
  const t = useTheme();
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 64 }}>
        <Tile icon={icon} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T style={{ fontSize: 15.5, fontWeight: '600' }}>{title}{optional ? <T style={{ fontSize: 12, color: t.mut, fontWeight: '400' }}>{'  optional'}</T> : null}</T>
          <T numberOfLines={1} style={{ fontSize: 13.5, marginTop: 1, color: value ? t.p : t.mut, fontWeight: value ? '500' : '400' }}>{value || 'Not added yet'}</T>
        </View>
        {!!value && <Icon name="check_circle" size={22} color={t.p} fill />}
      </View>
      <View style={{ paddingTop: 14, paddingHorizontal: 14, paddingBottom: 16, gap: 14, borderTopWidth: 1, borderColor: t.line }}>{children}</View>
    </Card>
  );
}

function Hint({ children }: { children: string }) {
  const t = useTheme();
  return <T style={{ fontSize: 12.5, color: t.mut, marginTop: -8, marginHorizontal: 4 }}>{children}</T>;
}

function Note({ icon, children }: { icon: IconName; children: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, backgroundColor: t.soft }}>
      <Icon name={icon} size={20} color={t.p} />
      <T style={{ flex: 1, fontSize: 13.5, lineHeight: 19 }}>{children}</T>
    </View>
  );
}

function PhotoTile({ uri, big, busy, label, badge, onPress }: { uri?: string | null; big?: boolean; busy?: boolean; label: string; badge?: string; onPress?: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress || busy} accessibilityRole="button" accessibilityLabel={uri ? `${badge ?? 'Photo'} added` : label}
      style={({ pressed }) => ({
        flex: big ? 2 : 1, aspectRatio: big ? 3 / 4 : undefined, minHeight: big ? undefined : 96,
        borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 4,
        borderWidth: uri ? 0 : big ? 2 : 1.5, borderStyle: big ? 'solid' : 'dashed', borderColor: big ? t.p : t.outline,
        backgroundColor: big && !uri ? undefined : t.bg, backgroundImage: big && !uri ? `linear-gradient(160deg, ${t.g1}, ${t.g2})` : undefined,
        opacity: pressed ? 0.8 : !onPress && !uri ? 0.5 : 1,
      })}>
      {uri ? <Image source={{ uri }} style={{ position: 'absolute', inset: 0 }} resizeMode="cover" /> : null}
      {busy ? <ActivityIndicator color={t.p} /> : !uri && (
        <>
          <Icon name={big ? 'add_a_photo' : 'add'} size={big ? 32 : 22} color={t.p} />
          <T style={{ fontSize: 12.5, fontWeight: '500', color: t.p, textAlign: 'center' }}>{label}</T>
        </>
      )}
      {badge && (
        <View style={{ position: 'absolute', left: 8, top: 8, flexDirection: 'row', alignItems: 'center', gap: 3, height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: t.p }}>
          <Icon name="public" size={13} color={t.op} />
          <T style={{ color: t.op, fontSize: 11, fontWeight: '600' }}>{badge}</T>
        </View>
      )}
      {uri && big && (
        <View style={{ position: 'absolute', right: 8, bottom: 8, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center' }}>
          <T style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Change</T>
        </View>
      )}
    </Pressable>
  );
}
