// 2k · Interests. iOS: segmented control. Android: tabs.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { api, type PhotoRequest, type ReceivedInterest, type SentInterest, type SentPhotoRequest } from '../../api';
import { Avatar, Button, Pill, Segmented, Switch, Tabs } from '../../components/Controls';
import { Icon } from '../../components/Icon';
import { Card, Empty, Screen, SectionTitle } from '../../components/Screen';
import { D, T } from '../../components/Text';
import { invalidate, setQueryData, useQuery } from '../../lib/query';
import { toast, toastError } from '../../lib/stores';
import { isIOS, mix, useTheme } from '../../theme';

const SEGS = ['Received', 'Sent', 'Photos'] as const;
type Seg = (typeof SEGS)[number];

export default function Interests() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [userSeg, setUserSeg] = useState<{ forTab?: string; seg: Seg } | null>(null);
  const routeSeg: Seg = tab && (SEGS as readonly string[]).includes(tab) ? (tab as Seg) : 'Received';
  const seg: Seg = userSeg && userSeg.forTab === tab ? userSeg.seg : routeSeg;
  const setSeg = (s: Seg) => setUserSeg({ forTab: tab, seg: s });
  const received = useQuery('interests:received', () => api.receivedInterests());
  const sent = useQuery('interests:sent', () => api.sentInterests());
  const photos = useQuery('interests:photos', () => api.photoRequests());
  const askedPhotos = useQuery('interests:photos-sent', () => api.sentPhotoRequests());
  const me = useQuery('me', () => api.getMe());
  const cur = seg === 'Received' ? received : seg === 'Sent' ? sent : photos;
  const refresh = () => { cur.reload(); if (seg === 'Photos') askedPhotos.reload(); };
  const noPhotos = photos.data?.length === 0 && askedPhotos.data?.length === 0;
  // Matches are the opposite gender, so the copy can say "her" or "his".
  const their = me.data?.gender === 'Woman' ? 'his' : 'her';

  return (
    <Screen aura tabRoot header={{ title: 'Interests', large: true, clear: true }} refreshing={cur.loading && !!cur.data} onRefresh={refresh} contentStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
      {isIOS ? (
        <View style={{ marginTop: 2, marginBottom: 16 }}><Segmented options={[...SEGS]} value={seg} onChange={(v) => setSeg(v as Seg)} fontSize={13} /></View>
      ) : (
        <View style={{ marginHorizontal: -16, marginBottom: 16 }}><Tabs options={[...SEGS]} value={seg} onChange={(v) => setSeg(v as Seg)} /></View>
      )}
      {cur.error && !cur.data && <Empty icon="error" text={cur.error.message} />}
      <View style={{ gap: 12 }}>
        {seg === 'Received' && (received.data?.length === 0 ? <Empty icon="favorite" text="No interests yet. They'll show up here." /> : received.data?.map((r) => <ReceivedCard key={r.id} r={r} their={their} />))}
        {seg === 'Sent' && (sent.data?.length === 0 ? <Empty icon="favorite" text="You haven't sent any interests yet." /> : sent.data?.map((r) => <SentCard key={r.id} r={r} />))}
        {seg === 'Photos' && (noPhotos ? (
          <Empty icon="photo_library" text="No photo requests yet. Ask from someone's profile to see their private photos." />
        ) : (
          <>
            {!!photos.data?.length && <SectionTitle style={{ marginTop: 4, marginBottom: -2 }}>Asked you</SectionTitle>}
            {photos.data?.map((r) => <PhotoCard key={r.id} r={r} />)}
            {!!askedPhotos.data?.length && <SectionTitle style={{ marginTop: photos.data?.length ? 14 : 4, marginBottom: -2 }}>You asked</SectionTitle>}
            {askedPhotos.data?.map((r) => <AskedPhotoCard key={r.id} r={r} />)}
          </>
        ))}
      </View>
    </Screen>
  );
}

function ReceivedCard({ r, their }: { r: ReceivedInterest; their: string }) {
  const t = useTheme();
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const [convId, setConvId] = useState<string | null>(null);

  const respond = async (accept: boolean) => {
    setBusy(accept ? 'accept' : 'decline');
    try {
      const { conversationId } = await api.respondInterest(r.id, accept);
      setConvId(conversationId);
      setQueryData<ReceivedInterest[]>('interests:received', (l) => (l ?? []).map((x) => (x.id === r.id ? { ...x, status: accept ? 'accepted' : 'declined' } : x)));
      if (accept) {
        invalidate('chats');
        toast(`You can now message ${r.from.first}`, 'lock_open');
      }
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(null);
    }
  };

  const openChat = async () => {
    let id = convId;
    if (!id) id = (await api.conversations().catch(() => [])).find((c) => c.other.id === r.from.id)?.id ?? null;
    if (id) router.push(`/chat/${id}`);
    else router.push('/chats');
  };

  return (
    <Card style={{ padding: 16 }}>
      <Pressable onPress={() => router.push(`/profile/${r.from.id}`)} accessibilityRole="button" accessibilityLabel={`View ${r.from.name}'s profile`}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.7 : 1 })}>
        <Avatar size={52} initials={r.from.initials} photo={r.from.photo} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <D style={{ fontSize: 19, lineHeight: 23 }}>{r.from.name}</D>
          <T style={{ fontSize: 13.5, color: t.mut }}>{[r.from.age, r.from.meta].filter(Boolean).join(' · ')}</T>
        </View>
        {r.score !== undefined && <Pill label={`${r.score}%`} bg={t.soft} fg={t.p} />}
        <Icon name="chevron_right" size={20} color={t.mut} />
      </Pressable>
      {!!r.note && (
        <View style={{ marginTop: 12, paddingVertical: 12, paddingHorizontal: 14, borderTopLeftRadius: 4, borderTopRightRadius: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, backgroundColor: t.bg }}>
          <T style={{ fontSize: 14.5, lineHeight: 21 }}>{r.note}</T>
        </View>
      )}
      {r.grant && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <Icon name="photo_library" size={16} color={t.mut} />
          <T style={{ fontSize: 13, color: t.mut }}>Shared {their} photos with you</T>
        </View>
      )}
      {r.status === 'pending' && (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <Button label="Decline" kind="ground" fontSize={15} onPress={() => respond(false)} busy={busy === 'decline'} disabled={!!busy && busy !== 'decline'} style={{ flex: 1 }} />
          <Button label="Accept" fontSize={15} onPress={() => respond(true)} busy={busy === 'accept'} disabled={!!busy && busy !== 'accept'} style={{ flex: 1 }} />
        </View>
      )}
      {r.status === 'accepted' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="lock_open" size={18} color={t.ok} />
            <T style={{ fontSize: 14, fontWeight: '600', color: t.ok }}>Chat open</T>
          </View>
          <Button label="Message" height={44} fontSize={14.5} onPress={openChat} style={{ paddingHorizontal: 18 }} />
        </View>
      )}
      {r.status === 'declined' && <T style={{ marginTop: 14, fontSize: 14, color: t.mut }}>Declined</T>}
    </Card>
  );
}

function SentCard({ r }: { r: SentInterest }) {
  const t = useTheme();
  const [grant, setGrant] = useState(r.grant);
  const colors = { Waiting: [t.soft, t.p], Accepted: [mix(t.ok, 14, t.s), t.ok], Declined: [t.line, t.mut] }[r.status];
  const toggle = async (v: boolean) => {
    setGrant(v);
    try {
      await api.setInterestPhotoAccess(r.id, v);
    } catch (e) {
      setGrant(!v);
      toastError(e);
    }
  };
  return (
    <Card style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
      <Pressable onPress={() => router.push(`/profile/${r.to.id}`)} accessibilityRole="button" accessibilityLabel={`View ${r.to.name}'s profile`}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.7 : 1 })}>
        <Avatar size={46} initials={r.to.initials} photo={r.to.photo} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T style={{ fontSize: 16, fontWeight: '600' }}>{r.to.name}</T>
          <T style={{ fontSize: 13.5, color: t.mut }}>{r.when}</T>
        </View>
        <Pill label={r.status} bg={colors[0]!} fg={colors[1]!} fontSize={12.5} />
      </Pressable>
      {r.status !== 'Declined' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: t.line }}>
          <T style={{ fontSize: 14.5 }}>Share my photos</T>
          <Switch on={grant} onChange={toggle} label={`Share my photos with ${r.to.first}`} />
        </View>
      )}
    </Card>
  );
}

function PhotoCard({ r }: { r: PhotoRequest }) {
  const t = useTheme();
  const set = async (status: 'approved' | 'declined' | 'revoked') => {
    const prev = r.status;
    setQueryData<PhotoRequest[]>('interests:photos', (l) => (l ?? []).map((x) => (x.id === r.id ? { ...x, status } : x)));
    try {
      await api.respondPhotoRequest(r.id, status);
      invalidate('me:viewers');
    } catch (e) {
      setQueryData<PhotoRequest[]>('interests:photos', (l) => (l ?? []).map((x) => (x.id === r.id ? { ...x, status: prev } : x)));
      toastError(e);
    }
  };
  const text = { pending: 'wants to see your other photos', approved: 'can see your other photos', revoked: 'can no longer see your other photos', declined: 'was declined' }[r.status];
  return (
    <Card style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
      <Pressable onPress={() => router.push(`/profile/${r.from.id}`)} accessibilityRole="button" accessibilityLabel={`View ${r.from.name}'s profile`}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.7 : 1 })}>
        <Avatar size={46} initials={r.from.initials} photo={r.from.photo} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T style={{ fontSize: 15, lineHeight: 20 }}>
            <T style={{ fontSize: 15, fontWeight: '600' }}>{r.from.name}</T> {text}
          </T>
          <T style={{ fontSize: 13, color: t.mut, marginTop: 2 }}>{r.when}</T>
        </View>
      </Pressable>
      {r.status === 'pending' && (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <Button label="Decline" kind="ground" height={44} fontSize={14.5} onPress={() => set('declined')} style={{ flex: 1 }} />
          <Button label="Allow" height={44} fontSize={14.5} onPress={() => set('approved')} style={{ flex: 1 }} />
        </View>
      )}
      {r.status === 'approved' && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
          <Pressable onPress={() => set('revoked')} style={{ height: 44, paddingHorizontal: 12, justifyContent: 'center' }}>
            <T style={{ color: t.bad, fontSize: 14.5, fontWeight: '600' }}>Remove access</T>
          </Pressable>
        </View>
      )}
    </Card>
  );
}

/** A photo request you sent. Tapping opens their profile. */
function AskedPhotoCard({ r }: { r: SentPhotoRequest }) {
  const t = useTheme();
  const status = {
    pending: { label: 'Waiting', bg: t.soft, fg: t.p },
    approved: { label: 'Allowed', bg: mix(t.ok, 14, t.s), fg: t.ok },
    declined: { label: 'Declined', bg: t.line, fg: t.mut },
    revoked: { label: 'Access removed', bg: t.line, fg: t.mut },
  }[r.status];
  return (
    <Card onPress={() => router.push(`/profile/${r.to.id}`)} style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar size={46} initials={r.to.initials} photo={r.to.photo} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T numberOfLines={1} style={{ fontSize: 16, fontWeight: '600' }}>{r.to.name}</T>
          <T style={{ fontSize: 13.5, color: t.mut }}>Asked {r.when.toLowerCase()}</T>
        </View>
        <Pill label={status.label} bg={status.bg} fg={status.fg} fontSize={12.5} />
      </View>
    </Card>
  );
}
