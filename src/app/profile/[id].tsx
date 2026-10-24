// 2h · Profile. iOS: inset grouped details and a pinned bottom button. Android: flat list and an extended FAB.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type Profile } from '../../api';
import { Avatar } from '../../components/Controls';
import { Icon } from '../../components/Icon';
import { InterestSheet } from '../../components/InterestSheet';
import { useSafety } from '../../components/Safety';
import { Empty, Screen, SectionTitle, StickyFooter } from '../../components/Screen';
import { Petals, ScoreTile } from '../../components/Score';
import { D, T } from '../../components/Text';
import { setQueryData, useQuery } from '../../lib/query';
import { toast, toastError } from '../../lib/stores';
import { alpha, isAndroid, isIOS, mix, useTheme } from '../../theme';

export default function ProfileScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery(`profile:${id}`, () => api.profile(id));
  const sent = useQuery('interests:sent', () => api.sentInterests());
  const [interest, setInterest] = useState(false);
  const m = q.data;
  const safety = useSafety(m ?? null, () => router.back());
  const isSent = !!sent.data?.some((s) => s.to.id === id);

  const header = {
    back: { label: 'Matches' },
    title: isIOS ? '' : (m?.first ?? ''),
    action: { icon: isIOS ? ('more_horiz' as const) : ('more_vert' as const), label: 'More', onPress: safety.open },
  };

  if (!m) {
    return (
      <Screen header={header}>
        {q.error ? <Empty icon="error" text={q.error.message} /> : <ActivityIndicator color={t.p} style={{ marginTop: 48 }} />}
      </Screen>
    );
  }

  const askPhotos = async () => {
    if (m.photoRequest) return;
    try {
      await api.requestPhotos(m.id);
      setQueryData<Profile>(`profile:${id}`, (p) => ({ ...p!, photoRequest: 'Pending' }));
      toast(`Photo request sent to ${m.first}`, 'photo_library');
    } catch (e) {
      toastError(e);
    }
  };

  const d = m.details ?? {};
  const sections = [
    { title: 'Jain details', rows: [['Sect', m.sect], ['Sub-sect', m.subSect], ['Diet', m.diet], ['Gotra', d.gotra], ['Native place', d.native], ['Mosal', d.mosal]] },
    { title: 'Work', rows: [['Education', m.education], ['Occupation', m.occupation], ['Income', m.income]] },
    { title: 'Family', rows: [['Father', d.father], ['Mother', d.mother], ['Siblings', d.siblings], ['Family', m.family], ['Status', m.marital], ['Languages', d.languages]] },
    { title: 'Kundli', rows: [['Birth time', d.tob], ['Birth place', d.pob]] },
  ]
    .map((s) => ({ ...s, rows: s.rows.filter((r): r is [string, string] => !!r[1]) }))
    .filter((s) => s.rows.length);

  const ctaIcon = isSent ? 'schedule' : 'favorite';
  const ctaLabel = isSent ? 'Interest sent' : 'Send interest';
  const openInterest = () => !isSent && setInterest(true);

  return (
    <Screen
      header={header}
      fill
      contentStyle={{ paddingBottom: isAndroid ? 96 + insets.bottom : 20 }}
      footer={isIOS && (
        <StickyFooter>
          <Pressable onPress={openInterest} accessibilityRole="button" style={{ height: 50, borderRadius: 14, backgroundColor: isSent ? t.soft : t.p, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name={ctaIcon} size={20} color={isSent ? t.p : t.op} fill />
            <T style={{ fontSize: 17, fontWeight: '600', color: isSent ? t.p : t.op }}>{ctaLabel}</T>
          </Pressable>
        </StickyFooter>
      )}
      overlay={
        isAndroid && (
        <Pressable onPress={openInterest} accessibilityRole="button"
          style={{ position: 'absolute', right: 16, bottom: 16 + insets.bottom, height: 56, paddingLeft: 16, paddingRight: 20, borderRadius: 16, backgroundColor: isSent ? mix(t.p, 18, t.s) : t.p, flexDirection: 'row', alignItems: 'center', gap: 10, boxShadow: '0px 4px 10px -2px rgba(0,0,0,0.25)' }}>
          <Icon name={ctaIcon} size={24} color={isSent ? t.ink : t.op} fill />
          <T style={{ fontSize: 15, fontWeight: '600', color: isSent ? t.ink : t.op }}>{ctaLabel}</T>
        </Pressable>
        )
      }
    >
      {/* Hero: shared photo, or initials with a request button */}
      <View style={{ height: 220, marginHorizontal: 16, borderRadius: 28, overflow: 'hidden', backgroundImage: t.aura(), alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        {m.photo ? (
          <>
            <Image source={{ uri: m.photo }} style={{ position: 'absolute', inset: 0 }} resizeMode="cover" />
            <View style={{ position: 'absolute', left: 14, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: alpha(t.s, 0.88) }}>
              <Icon name="lock_open" size={16} color={t.ink} />
              <T style={{ fontSize: 13, fontWeight: '500' }}>Shared with you</T>
            </View>
          </>
        ) : (
          <>
            <Avatar size={112} initials={m.initials} onSurface />
            {m.photosLocked && (
              <Pressable onPress={askPhotos} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: alpha(t.s, 0.88) }}>
                <Icon name={m.photoRequest ? 'schedule' : 'lock'} size={17} color={t.ink} />
                <T style={{ fontSize: 13.5, fontWeight: '500' }}>{m.photoRequest === 'Declined' ? 'Request declined' : m.photoRequest ? 'Request sent' : 'Request photos'}</T>
              </Pressable>
            )}
          </>
        )}
      </View>

      <View style={{ paddingTop: 18, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <D accessibilityRole="header" style={{ fontSize: 28, lineHeight: 33 }}>{m.name}</D>
          {m.verified && <Icon name="verified" size={22} color={t.p} fill />}
        </View>
        <T style={{ fontSize: 14.5, color: t.mut, marginTop: 4 }}>{[m.age, m.height, m.city].filter(Boolean).join(' · ')}</T>
      </View>

      {m.score && (
        <View style={{ paddingTop: 16, paddingHorizontal: 16 }}>
          <Pressable onPress={() => router.push(`/compat/${m.id}`)} accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.card, boxShadow: t.cardShadow }}>
            {t.score === 'petals' ? <Petals rows={m.score.rows} size={64} total={m.score.total} /> : <ScoreTile total={m.score.total} />}
            <View style={{ flex: 1 }}>
              <T style={{ fontSize: 16, fontWeight: '600' }}>{m.score.total}% match</T>
              <T style={{ fontSize: 13.5, color: t.mut, marginTop: 2 }}>See how you line up</T>
            </View>
            <Icon name="chevron_right" size={22} color={t.mut} />
          </Pressable>
        </View>
      )}

      {(m.bio || !!m.hobbies?.length) && (
        <View style={{ paddingTop: 22, paddingHorizontal: 20 }}>
          {m.bio && <T style={{ fontSize: 15.5, lineHeight: 24 }}>{m.bio}</T>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {m.hobbies?.map((h) => (
              <View key={h} style={{ height: 28, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 14, backgroundColor: t.soft }}>
                <T style={{ color: t.p, fontSize: 13, fontWeight: '500' }}>{h}</T>
              </View>
            ))}
          </View>
        </View>
      )}

      {sections.map((s) => (
        <View key={s.title} style={{ paddingTop: 24, paddingHorizontal: 16 }}>
          <SectionTitle>{s.title}</SectionTitle>
          <View style={{ backgroundColor: t.grpBg, borderRadius: t.grpR, paddingHorizontal: t.grpPx }}>
            {s.rows.map(([k, v], i) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 12, borderTopWidth: i && isIOS ? 0.5 : 0, borderColor: t.line }}>
                <T style={{ color: t.mut, fontSize: 15 }}>{k}</T>
                <T style={{ fontSize: 15, flexShrink: 1, textAlign: 'right' }}>{v}</T>
              </View>
            ))}
          </View>
        </View>
      ))}

      <InterestSheet m={m} open={interest} onClose={() => setInterest(false)} />
      {safety.element}
    </Screen>
  );
}
