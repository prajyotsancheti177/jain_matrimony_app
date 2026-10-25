// People you've blocked, with Unblock. iOS: inset grouped list + alert. Android: flat list + Material dialog.
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { api, type BlockedPerson } from '../api';
import { Avatar } from '../components/Controls';
import { M3Dialog } from '../components/Overlays';
import { Empty, Screen } from '../components/Screen';
import { T } from '../components/Text';
import { invalidate, setQueryData, useQuery } from '../lib/query';
import { toast, toastError } from '../lib/stores';
import { isIOS, useTheme } from '../theme';

export default function Blocked() {
  const t = useTheme();
  const q = useQuery('me:blocked', () => api.blockedList());
  const [confirm, setConfirm] = useState<BlockedPerson | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const unblock = async (p: BlockedPerson) => {
    setConfirm(null);
    setBusyId(p.id);
    try {
      await api.unblock(p.id);
      setQueryData<BlockedPerson[]>('me:blocked', (l) => (l ?? []).filter((x) => x.id !== p.id));
      invalidate('matches');
      toast(`${p.name} is unblocked`, 'lock_open');
    } catch (e) {
      toastError(e);
    } finally {
      setBusyId(null);
    }
  };

  const ask = (p: BlockedPerson) => {
    if (isIOS) {
      Alert.alert(`Unblock ${p.first}?`, `${p.first} will be able to see your profile and send you interests again.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unblock', onPress: () => unblock(p) },
      ]);
    } else setConfirm(p);
  };

  const list = q.data;
  return (
    <Screen header={{ title: 'Blocked', back: { label: 'Profile' } }} refreshing={q.loading && !!list} onRefresh={q.reload}
      contentStyle={{ paddingTop: 8, paddingHorizontal: 16, paddingBottom: 24 }}>
      {!list ? (
        q.error ? <Empty icon="error" text={q.error.message} /> : <ActivityIndicator color={t.p} style={{ marginTop: 48 }} />
      ) : list.length === 0 ? (
        <Empty icon="person_off" text={"You haven't blocked anyone.\nPeople you block can't see your profile or message you."} />
      ) : (
        <>
          <T style={{ fontSize: 14, lineHeight: 20, color: t.mut, marginHorizontal: 4, marginBottom: 16 }}>
            {"They can't see your profile, send you interests or message you. They aren't told they're blocked."}
          </T>
          <View style={{ backgroundColor: t.grpBg, borderRadius: t.grpR, overflow: 'hidden' }}>
            {list.map((p, i) => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 68, paddingHorizontal: t.grpPx }}>
                <Avatar size={44} initials={p.initials} />
                <View style={{ flex: 1, minWidth: 0, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: i && isIOS ? 0.5 : 0, borderColor: t.line }}>
                  <View style={{ flex: 1, minWidth: 0, paddingVertical: 12 }}>
                    <T numberOfLines={1} style={{ fontSize: 16, fontWeight: '600' }}>{p.name}</T>
                    <T style={{ fontSize: 13.5, color: t.mut, marginTop: 1 }}>Blocked {p.since.toLowerCase()}</T>
                  </View>
                  {busyId === p.id ? (
                    <ActivityIndicator color={t.p} style={{ width: 84 }} />
                  ) : (
                    <Pressable onPress={() => ask(p)} accessibilityRole="button" accessibilityLabel={`Unblock ${p.name}`}
                      style={({ pressed }) => ({ height: 36, paddingHorizontal: 14, borderRadius: t.chipR, backgroundColor: t.soft, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
                      <T style={{ color: t.p, fontSize: 14, fontWeight: '600' }}>Unblock</T>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </View>
        </>
      )}
      <M3Dialog open={!!confirm} onClose={() => setConfirm(null)} icon="lock_open" title={`Unblock ${confirm?.first ?? ''}?`}
        body={`${confirm?.first ?? 'They'} will be able to see your profile and send you interests again.`} confirm="Unblock" onConfirm={() => confirm && unblock(confirm)} />
    </Screen>
  );
}
