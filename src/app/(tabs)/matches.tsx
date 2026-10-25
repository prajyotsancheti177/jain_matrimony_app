// 2g · Matches feed.
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { api, type MatchFilter, type Profile } from '../../api';
import { Avatar, Button, Chip } from '../../components/Controls';
import { Icon } from '../../components/Icon';
import { InterestSheet } from '../../components/InterestSheet';
import { Empty, Screen } from '../../components/Screen';
import { Petals, ScoreBadge } from '../../components/Score';
import { D, T } from '../../components/Text';
import { useQuery } from '../../lib/query';
import { alpha, useTheme } from '../../theme';

const FILTERS: MatchFilter[] = ['All', 'Verified', 'Strict Jain', 'Gujarat', 'Nearby'];

export default function Matches() {
  const [filter, setFilter] = useState<MatchFilter>('All');
  const [interestFor, setInterestFor] = useState<Profile | null>(null);
  const q = useQuery(`matches:${filter}`, () => api.matches(filter));
  const sent = useQuery('interests:sent', () => api.sentInterests());
  const sentIds = new Set((sent.data ?? []).map((s) => s.to.id));

  return (
    <Screen aura tabRoot header={{ title: 'Matches', large: true, clear: true, action: { icon: 'tune', label: 'Preferences', onPress: () => router.push('/prefs') } }}
      refreshing={q.loading && !!q.data} onRefresh={q.reload} contentStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 2, paddingBottom: 14 }}>
        {FILTERS.map((f) => <Chip key={f} label={f} on={filter === f} onPress={() => setFilter(f)} height={34} />)}
      </ScrollView>

      {q.error && !q.data ? (
        <Empty icon="error" text={q.error.message} />
      ) : q.data && q.data.length === 0 ? (
        <Empty icon="local_florist" text="No matches for this filter yet. Try another, or widen your preferences." />
      ) : (
        <View style={{ gap: 18 }}>
          {(q.data ?? []).map((m) => (
            <MatchCard key={m.id} m={m} sent={sentIds.has(m.id)} onInterest={() => setInterestFor(m)} />
          ))}
        </View>
      )}
      <InterestSheet m={interestFor} open={!!interestFor} onClose={() => setInterestFor(null)} />
    </Screen>
  );
}

function MatchCard({ m, sent, onInterest }: { m: Profile; sent: boolean; onInterest: () => void }) {
  const t = useTheme();
  const open = () => router.push(`/profile/${m.id}`);
  return (
    <View style={{ backgroundColor: t.card, borderRadius: 24, overflow: 'hidden', boxShadow: t.cardShadow }}>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`Open ${m.name}'s profile`} style={{ height: 176, backgroundImage: t.aura() }}>
        {m.photo ? (
          <Image source={{ uri: m.photo }} style={{ position: 'absolute', inset: 0 }} resizeMode="cover" />
        ) : (
          <View style={{ position: 'absolute', left: 20, top: 22 }}><Avatar size={96} initials={m.initials} onSurface /></View>
        )}
        {m.score && (
          <View style={{ position: 'absolute', right: 16, top: 16 }}>
            {t.score === 'petals' ? <Petals rows={m.score.rows} size={92} total={m.score.total} /> : <ScoreBadge total={m.score.total} />}
          </View>
        )}
        <View style={{ position: 'absolute', left: 20, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: alpha(t.s, 0.88) }}>
          <Icon name={m.photosLocked ? 'lock' : 'lock_open'} size={15} color={t.ink} />
          <T style={{ fontSize: 12.5, fontWeight: '500' }}>{m.photosLocked ? 'More photos private' : 'Photos shared'}</T>
        </View>
      </Pressable>
      <View style={{ paddingTop: 14, paddingHorizontal: 18, paddingBottom: 18 }}>
        <Pressable onPress={open} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <D style={{ fontSize: 23, lineHeight: 28 }}>{m.name}</D>
          {m.verified && <Icon name="verified" size={20} color={t.p} fill />}
        </Pressable>
        <T style={{ fontSize: 14, color: t.mut, marginTop: 2 }}>{[m.age, m.cityShort, m.occupation].filter(Boolean).join(' · ')}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {[m.sect, m.subSect, m.diet].filter(Boolean).map((tag) => (
            <View key={tag} style={{ height: 26, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 13, backgroundColor: t.bg }}>
              <T style={{ fontSize: 12.5, fontWeight: '500' }}>{tag}</T>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <Button label="View" kind="soft" fontSize={15} onPress={open} style={{ flex: 1 }} />
          <Button label={sent ? 'Sent' : 'Send interest'} kind={sent ? 'soft' : 'primary'} icon={sent ? 'check' : 'favorite'} iconFill fontSize={15} onPress={sent ? undefined : onInterest} style={{ flex: 1.4 }} />
        </View>
      </View>
    </View>
  );
}
