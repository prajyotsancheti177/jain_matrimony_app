// 2k · Interests (redesign): what needs your answer first, finished items folded away.
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { api, type PhotoRequest, type ReceivedInterest, type SentInterest, type SentPhotoRequest } from '../../api';
import { Avatar, Button, Switch } from '../../components/Controls';
import { Icon, type IconName } from '../../components/Icon';
import { Empty, Screen } from '../../components/Screen';
import { D, T } from '../../components/Text';
import { invalidate, setQueryData, useQuery } from '../../lib/query';
import { toast, toastError } from '../../lib/stores';
import { mix, useTheme } from '../../theme';

const SEGS = [
  { key: 'Received', label: 'For you' },
  { key: 'Sent', label: 'Sent' },
  { key: 'Photos', label: 'Photos' },
] as const;
type Seg = (typeof SEGS)[number]['key'];

export default function Interests() {
  const t = useTheme();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [userSeg, setUserSeg] = useState<{ forTab?: string; seg: Seg } | null>(null);
  const routeSeg: Seg = SEGS.some((s) => s.key === tab) ? (tab as Seg) : 'Received';
  const seg: Seg = userSeg && userSeg.forTab === tab ? userSeg.seg : routeSeg;
  const setSeg = (s: Seg) => setUserSeg({ forTab: tab, seg: s });
  const received = useQuery('interests:received', () => api.receivedInterests());
  const sent = useQuery('interests:sent', () => api.sentInterests());
  const photos = useQuery('interests:photos', () => api.photoRequests());
  const askedPhotos = useQuery('interests:photos-sent', () => api.sentPhotoRequests());
  const me = useQuery('me', () => api.getMe());
  const cur = seg === 'Received' ? received : seg === 'Sent' ? sent : photos;
  const refresh = () => { cur.reload(); if (seg === 'Photos') askedPhotos.reload(); };
  // Matches are the opposite gender, so the copy can say "her" or "his".
  const their = me.data?.gender === 'Woman' ? 'his' : 'her';

  const counts: Record<Seg, number> = {
    Received: received.data?.filter((r) => r.status === 'pending').length ?? 0,
    Sent: sent.data?.filter((r) => r.status === 'Waiting').length ?? 0,
    Photos: photos.data?.filter((r) => r.status === 'pending').length ?? 0,
  };

  return (
    <Screen aura tabRoot header={{ title: 'Interests', large: true, clear: true }} refreshing={cur.loading && !!cur.data} onRefresh={refresh} contentStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 999, backgroundColor: mix(t.s, 70, t.bg), marginBottom: 6 }}>
        {SEGS.map((s) => {
          const on = seg === s.key;
          const n = counts[s.key];
          return (
            <Pressable key={s.key} onPress={() => setSeg(s.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${s.label}${n ? `, ${n} new` : ''}`}
              style={({ pressed }) => ({ flex: 1, height: 40, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: on ? t.p : 'transparent', opacity: pressed ? 0.8 : 1 })}>
              <T style={{ fontSize: 14, fontWeight: '600', color: on ? t.op : t.mut }}>{s.label}</T>
              {n > 0 && (
                <View style={{ minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: s.key === 'Sent' ? (on ? mix(t.op, 25, t.p) : t.line) : t.a }}>
                  <T style={{ fontSize: 12, fontWeight: '700', color: s.key === 'Sent' ? (on ? t.op : t.mut) : t.ink }}>{n}</T>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      {cur.error && !cur.data && <Empty icon="error" text={cur.error.message} />}
      {seg === 'Received' && received.data && <ForYou list={received.data} their={their} />}
      {seg === 'Sent' && sent.data && <Sent list={sent.data} />}
      {seg === 'Photos' && photos.data && <Photos asked={photos.data} mine={askedPhotos.data ?? []} />}
    </Screen>
  );
}

function Section({ title, count, hint }: { title: string; count?: number; hint?: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 18, marginBottom: 10, marginHorizontal: 4 }}>
      <T accessibilityRole="header" style={{ fontSize: 15, fontWeight: '700' }}>
        {title}{count !== undefined && <T style={{ fontSize: 15, color: t.mut, fontWeight: '500' }}> · {count}</T>}
      </T>
      {!!hint && <T style={{ fontSize: 12.5, color: t.mut }}>{hint}</T>}
    </View>
  );
}

function Fold({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  const t = useTheme();
  return (
    <>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({ height: 44, marginTop: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: pressed ? mix(t.p, 6, t.bg) : 'transparent' })}>
        <Icon name={open ? 'keyboard_arrow_up' : 'keyboard_arrow_down'} size={20} color={t.mut} />
        <T style={{ fontSize: 14, fontWeight: '500', color: t.mut }}>{open ? 'Hide' : 'Show'} {label}</T>
      </Pressable>
      {open && children}
    </>
  );
}

/** White card with a soft shadow, matching Preferences. */
function Box({ children, pad = 14 }: { children: ReactNode; pad?: number }) {
  const t = useTheme();
  return <View style={{ backgroundColor: t.s, borderRadius: 16, padding: pad, boxShadow: '0px 2px 10px -4px rgba(12,38,41,0.16)' }}>{children}</View>;
}

function Row({ children, first }: { children: ReactNode; first?: boolean }) {
  const t = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 68, borderTopWidth: first ? 0 : 1, borderColor: t.line }}>{children}</View>;
}

function Status({ label, tone, icon }: { label: string; tone: 'wait' | 'yes' | 'no'; icon?: IconName }) {
  const t = useTheme();
  const [bg, fg] = tone === 'yes' ? [mix(t.ok, 14, t.s), t.ok] : tone === 'wait' ? [t.soft, t.p] : [t.line, t.mut];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: bg }}>
      {icon && <Icon name={icon} size={14} color={fg} />}
      <T style={{ fontSize: 12.5, fontWeight: '600', color: fg }}>{label}</T>
    </View>
  );
}

// ---------- For you ----------

function ForYou({ list, their }: { list: ReceivedInterest[]; their: string }) {
  const t = useTheme();
  const [showDeclined, setShowDeclined] = useState(false);
  const pending = list.filter((r) => r.status === 'pending');
  const declined = list.filter((r) => r.status === 'declined');
  return (
    <>
      <Section title="Waiting for your reply" count={pending.length} />
      {pending.length === 0 ? (
        <Empty icon="check_circle" text={"You're all caught up.\nNew interests will show up here."} />
      ) : (
        <View style={{ gap: 10 }}>{pending.map((r) => <ReceivedCard key={r.id} r={r} their={their} />)}</View>
      )}
      {declined.length > 0 && (
        <Fold label={`declined (${declined.length})`} open={showDeclined} onToggle={() => setShowDeclined(!showDeclined)}>
          <Box pad={0}>
            {declined.map((r, i) => (
              <Row key={r.id} first={i === 0}>
                <Avatar size={44} initials={r.from.initials} photo={r.from.photo} />
                <Pressable onPress={() => router.push(`/profile/${r.from.id}`)} style={{ flex: 1, minWidth: 0 }}>
                  <T numberOfLines={1} style={{ fontSize: 15.5, fontWeight: '600' }}>{r.from.name}</T>
                  <T numberOfLines={1} style={{ fontSize: 13, color: t.mut, marginTop: 2 }}>{[r.from.age, r.from.meta].filter(Boolean).join(' · ')}</T>
                </Pressable>
                <Status label="Declined" tone="no" />
              </Row>
            ))}
          </Box>
        </Fold>
      )}
    </>
  );
}

function ReceivedCard({ r, their }: { r: ReceivedInterest; their: string }) {
  const t = useTheme();
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const [open, setOpen] = useState(false);

  const respond = async (accept: boolean) => {
    setBusy(accept ? 'accept' : 'decline');
    try {
      const { conversationId } = await api.respondInterest(r.id, accept);
      setQueryData<ReceivedInterest[]>('interests:received', (l) => (l ?? []).map((x) => (x.id === r.id ? { ...x, status: accept ? 'accepted' : 'declined' } : x)));
      if (accept) {
        invalidate('chats');
        toast(`You and ${r.from.first} can now chat`, 'forum');
        if (conversationId) router.push(`/chat/${conversationId}`);
      } else toast(`Declined ${r.from.first}`, 'close');
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Box>
      <Pressable onPress={() => router.push(`/profile/${r.from.id}`)} accessibilityRole="button" accessibilityLabel={`View ${r.from.name}'s profile`}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.7 : 1 })}>
        <Avatar size={56} initials={r.from.initials} photo={r.from.photo} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <D numberOfLines={1} style={{ fontSize: 19, lineHeight: 23 }}>{r.from.name}</D>
          <T numberOfLines={1} style={{ fontSize: 13, color: t.mut, marginTop: 2 }}>{[r.from.age, r.from.meta].filter(Boolean).join(' · ')}</T>
        </View>
        {r.score !== undefined && (
          <View style={{ alignItems: 'flex-end' }}>
            <D style={{ fontSize: 20, lineHeight: 22, color: t.p }}>{r.score}%</D>
            <T style={{ fontSize: 11, color: t.mut }}>match</T>
          </View>
        )}
      </Pressable>
      {!!r.note && (
        <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityHint={open ? 'Shows less' : 'Shows the whole note'}>
          <T numberOfLines={open ? undefined : 2} style={{ marginTop: 12, fontSize: 14.5, lineHeight: 21 }}>
            <T style={{ color: t.p, fontWeight: '700' }}>“</T>{r.note}<T style={{ color: t.p, fontWeight: '700' }}>”</T>
          </T>
        </Pressable>
      )}
      {r.grant && (
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: t.soft }}>
            <Icon name="photo_library" size={15} color={t.p} />
            <T style={{ fontSize: 12.5, fontWeight: '500', color: t.p }}>Shared {their} photos</T>
          </View>
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Button label="Decline" kind="ground" height={44} fontSize={15} onPress={() => respond(false)} busy={busy === 'decline'} disabled={!!busy && busy !== 'decline'} style={{ paddingHorizontal: 20, borderWidth: 1.5, borderColor: t.line }} />
        <Button label="Accept" icon="favorite" iconFill height={44} fontSize={15} onPress={() => respond(true)} busy={busy === 'accept'} disabled={!!busy && busy !== 'accept'} style={{ flex: 1 }} />
      </View>
    </Box>
  );
}

// ---------- Sent ----------

function Sent({ list }: { list: SentInterest[] }) {
  const t = useTheme();
  const [showNo, setShowNo] = useState(false);
  const yes = list.filter((r) => r.status === 'Accepted');
  const waiting = list.filter((r) => r.status === 'Waiting');
  const no = list.filter((r) => r.status === 'Declined');

  const openChat = async (id: string) => {
    const c = (await api.conversations().catch(() => [])).find((x) => x.other.id === id);
    router.push(c ? `/chat/${c.id}` : '/chats');
  };

  return (
    <>
      {yes.length > 0 && (
        <View style={{ gap: 8, marginTop: 12 }}>
          {yes.map((r) => (
            <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: mix(t.ok, 12, t.s) }}>
              <Avatar size={44} initials={r.to.initials} photo={r.to.photo} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T numberOfLines={1} style={{ fontSize: 15, fontWeight: '600' }}>{r.to.first} said yes</T>
                <T style={{ fontSize: 13, color: t.ok, marginTop: 1 }}>Your chat is open</T>
              </View>
              <Button label="Message" icon="forum" height={38} fontSize={14} onPress={() => openChat(r.to.id)} style={{ paddingHorizontal: 14 }} />
            </View>
          ))}
        </View>
      )}
      <Section title="Waiting" count={waiting.length} hint="They haven't replied yet" />
      {waiting.length === 0 ? (
        <Empty icon="favorite" text={'No pending interests.\nSend one from Matches.'} />
      ) : (
        <Box pad={0}>{waiting.map((r, i) => <WaitingRow key={r.id} r={r} first={i === 0} />)}</Box>
      )}
      {no.length > 0 && (
        <Fold label={`not this time (${no.length})`} open={showNo} onToggle={() => setShowNo(!showNo)}>
          <Box pad={0}>
            {no.map((r, i) => (
              <Row key={r.id} first={i === 0}>
                <Avatar size={44} initials={r.to.initials} photo={r.to.photo} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T numberOfLines={1} style={{ fontSize: 15.5, fontWeight: '600' }}>{r.to.name}</T>
                  <T style={{ fontSize: 13, color: t.mut, marginTop: 2 }}>{r.when}</T>
                </View>
                <Status label="Declined" tone="no" />
              </Row>
            ))}
          </Box>
        </Fold>
      )}
    </>
  );
}

function WaitingRow({ r, first }: { r: SentInterest; first: boolean }) {
  const t = useTheme();
  const [grant, setGrant] = useState(r.grant);
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
    <View style={{ borderTopWidth: first ? 0 : 1, borderColor: t.line }}>
      <Pressable onPress={() => router.push(`/profile/${r.to.id}`)} accessibilityRole="button" accessibilityLabel={`View ${r.to.name}'s profile`}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingHorizontal: 14, opacity: pressed ? 0.7 : 1 })}>
        <Avatar size={44} initials={r.to.initials} photo={r.to.photo} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T numberOfLines={1} style={{ fontSize: 15.5, fontWeight: '600' }}>{r.to.name}</T>
          <T style={{ fontSize: 13, color: t.mut, marginTop: 2 }}>Sent {r.when.toLowerCase()}</T>
        </View>
        <Status label="Waiting" tone="wait" icon="schedule" />
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 70, paddingRight: 14, paddingBottom: 10, paddingTop: 4 }}>
        <Icon name="photo_library" size={16} color={t.mut} />
        <T style={{ flex: 1, fontSize: 13, color: t.mut }}>Share my photos with {r.to.first}</T>
        <Switch on={grant} onChange={toggle} label={`Share my photos with ${r.to.first}`} />
      </View>
    </View>
  );
}

// ---------- Photos ----------

function Photos({ asked, mine }: { asked: PhotoRequest[]; mine: SentPhotoRequest[] }) {
  const t = useTheme();
  const pending = asked.filter((r) => r.status === 'pending');
  const allowed = asked.filter((r) => r.status === 'approved');

  const set = async (r: PhotoRequest, status: 'approved' | 'declined' | 'revoked') => {
    const prev = r.status;
    setQueryData<PhotoRequest[]>('interests:photos', (l) => (l ?? []).map((x) => (x.id === r.id ? { ...x, status } : x)));
    try {
      await api.respondPhotoRequest(r.id, status);
      invalidate('me:viewers');
      toast(status === 'approved' ? `${r.from.first} can see your photos` : status === 'revoked' ? `${r.from.first} can no longer see your photos` : 'Request declined', status === 'approved' ? 'lock_open' : 'lock');
    } catch (e) {
      setQueryData<PhotoRequest[]>('interests:photos', (l) => (l ?? []).map((x) => (x.id === r.id ? { ...x, status: prev } : x)));
      toastError(e);
    }
  };

  const status = (s: SentPhotoRequest['status']) =>
    s === 'approved' ? <Status label="Allowed" tone="yes" icon="lock_open" /> : s === 'pending' ? <Status label="Waiting" tone="wait" icon="schedule" />
      : <Status label={s === 'revoked' ? 'Access removed' : 'Declined'} tone="no" />;

  return (
    <>
      <Section title="Want to see your photos" count={pending.length} />
      {pending.length === 0 ? (
        <T style={{ fontSize: 14, color: t.mut, marginHorizontal: 4 }}>No new requests.</T>
      ) : (
        <View style={{ gap: 10 }}>
          {pending.map((r) => (
            <Box key={r.id}>
              <Pressable onPress={() => router.push(`/profile/${r.from.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar size={44} initials={r.from.initials} photo={r.from.photo} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T style={{ fontSize: 15, lineHeight: 20 }}><T style={{ fontSize: 15, fontWeight: '600' }}>{r.from.name}</T> asked to see your extra photos</T>
                  <T style={{ fontSize: 13, color: t.mut, marginTop: 2 }}>{r.when}</T>
                </View>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Button label="Not now" kind="ground" height={44} fontSize={14.5} onPress={() => set(r, 'declined')} style={{ paddingHorizontal: 18, borderWidth: 1.5, borderColor: t.line }} />
                <Button label="Allow" icon="lock_open" height={44} fontSize={14.5} onPress={() => set(r, 'approved')} style={{ flex: 1 }} />
              </View>
            </Box>
          ))}
        </View>
      )}

      <Section title="Can see your photos" count={allowed.length} />
      {allowed.length === 0 ? (
        <T style={{ fontSize: 14, color: t.mut, marginHorizontal: 4 }}>Nobody yet.</T>
      ) : (
        <Box pad={0}>
          {allowed.map((r, i) => (
            <Row key={r.id} first={i === 0}>
              <Avatar size={44} initials={r.from.initials} photo={r.from.photo} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T numberOfLines={1} style={{ fontSize: 15.5, fontWeight: '600' }}>{r.from.name}</T>
                <T style={{ fontSize: 13, color: t.mut, marginTop: 2 }}>{r.when}</T>
              </View>
              <Pressable onPress={() => set(r, 'revoked')} accessibilityRole="button" accessibilityLabel={`Remove ${r.from.name}'s access`}
                style={({ pressed }) => ({ height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1.5, borderColor: t.line, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
                <T style={{ fontSize: 14, fontWeight: '600', color: t.bad }}>Remove</T>
              </Pressable>
            </Row>
          ))}
        </Box>
      )}

      {mine.length > 0 && (
        <>
          <Section title="You asked" count={mine.length} />
          <Box pad={0}>
            {mine.map((r, i) => (
              <Pressable key={r.id} onPress={() => router.push(`/profile/${r.to.id}`)}>
                <Row first={i === 0}>
                  <Avatar size={44} initials={r.to.initials} photo={r.to.photo} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T numberOfLines={1} style={{ fontSize: 15.5, fontWeight: '600' }}>{r.to.name}</T>
                    <T style={{ fontSize: 13, color: t.mut, marginTop: 2 }}>Asked {r.when.toLowerCase()}</T>
                  </View>
                  {status(r.status)}
                </Row>
              </Pressable>
            ))}
          </Box>
        </>
      )}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, marginHorizontal: 4 }}>
        <Icon name="lock" size={16} color={t.mut} />
        <T style={{ flex: 1, fontSize: 12.5, lineHeight: 18, color: t.mut }}>Your profile photo is always visible. These requests are only for your extra photos.</T>
      </View>
    </>
  );
}
