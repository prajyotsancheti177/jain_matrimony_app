// 2p · Profile & settings, with 2s · Delete account (iOS alert / Material dialog).
// Long-press the profile card to open the hidden Theme lab.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, View } from 'react-native';
import { api, type Me } from '../../api';
import { Avatar, Switch } from '../../components/Controls';
import { Icon, type IconName } from '../../components/Icon';
import { M3Dialog } from '../../components/Overlays';
import { Screen, SectionTitle } from '../../components/Screen';
import { D, T } from '../../components/Text';
import { invalidate, setQueryData, useQuery } from '../../lib/query';
import { signOut } from '../../lib/session';
import { toast, toastError } from '../../lib/stores';
import { alpha, isAndroid, isIOS, useTheme } from '../../theme';

const TILE = ['#5B3FD1', '#FF8FA3', '#1F8A5B', '#7CA7FF', '#FFB547', '#8E8E93'];
const DANGER_TILE = '#C62F3B';
const ALERTS_KEY = 'soulsync.familyAlerts';

type Row = { icon: IconName; t: string; d?: string; value?: string; chev?: boolean; sw?: boolean; on?: boolean; toggle?: (v: boolean) => void; onPress?: () => void; danger?: boolean };

export default function MeScreen() {
  const t = useTheme();
  const me = useQuery('me', () => api.getMe());
  const blocked = useQuery('me:blocked', () => api.blockedCount());
  const viewers = useQuery('me:viewers', async () => {
    const [photos, sent] = await Promise.all([api.photoRequests(), api.sentInterests()]);
    return photos.filter((p) => p.status === 'approved').length + sent.filter((s) => s.grant && s.status !== 'Declined').length;
  });
  const [alerts, setAlerts] = useState(true);
  const [del, setDel] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ALERTS_KEY).then((v) => v !== null && setAlerts(v === '1')).catch(() => {});
  }, []);

  const m = me.data;
  const update = async (patch: Parameters<typeof api.updateMe>[0]) => {
    const prev = m;
    setQueryData<Me>('me', (x) => ({ ...x!, ...patch }));
    try {
      const next = await api.updateMe(patch);
      setQueryData<Me>('me', () => next);
    } catch (e) {
      setQueryData<Me>('me', () => prev!);
      toastError(e);
    }
  };

  const addPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 0.85 });
    if (r.canceled || !r.assets[0] || !m) return;
    const a = r.assets[0];
    setUploading(true);
    try {
      const url = await api.uploadPhoto({ uri: a.uri, name: a.fileName ?? 'photo.jpg', mimeType: a.mimeType ?? 'image/jpeg' });
      await update({ photos: [...m.photos, url] });
      toast('Photo added', 'add_a_photo');
    } catch (e) {
      toastError(e);
    } finally {
      setUploading(false);
    }
  };

  const download = async () => {
    try {
      const data = await api.exportData();
      const file = new File(Paths.cache, 'soulsync-my-data.json');
      file.write(JSON.stringify(data, null, 2));
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Your SoulSync data' });
      toast('Your data is ready to download', 'download_done');
    } catch (e) {
      toastError(e);
    }
  };

  const doDelete = async () => {
    setDel(false);
    try {
      await api.deleteAccount();
      await signOut(false);
      toast('Account deleted', 'delete');
    } catch (e) {
      toastError(e);
    }
  };
  const askDelete = () => {
    if (isIOS) {
      Alert.alert('Delete account?', "Your profile, photos and chats will be erased. This can't be undone.", [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    } else setDel(true);
  };

  const kycLabel = m?.kycStatus === 'Pending' ? 'In review' : m?.kycStatus === 'Approved' ? 'Verified' : m?.kycStatus === 'Rejected' ? 'Try again' : 'Not yet';
  const groups: { title: string; rows: Row[] }[] = [
    { title: 'Matching', rows: [
      { icon: 'tune', t: 'Preferences', chev: true, onPress: () => router.push('/prefs') },
      { icon: 'verified', t: 'Get verified', value: kycLabel, chev: true, onPress: () => router.push('/kyc') },
    ] },
    { title: 'Privacy', rows: [
      { icon: 'lock', t: 'Private photos', d: 'Only people you allow', sw: true, on: m?.photosLocked ?? true, toggle: (v) => update({ photosLocked: v }) },
      { icon: 'notifications', t: 'Family alerts', d: 'Also sent to 2 family phones', sw: true, on: alerts, toggle: (v) => { setAlerts(v); AsyncStorage.setItem(ALERTS_KEY, v ? '1' : '0').catch(() => {}); } },
      { icon: 'block', t: 'Blocked', value: String(blocked.data ?? 0) },
    ] },
    { title: 'Your data', rows: [
      { icon: 'download', t: 'Download my data', chev: true, onPress: download },
      { icon: 'delete', t: 'Delete account', danger: true, onPress: askDelete },
    ] },
  ];

  let tile = 0;
  return (
    <Screen aura tabRoot header={{ title: 'Profile', large: true, clear: true }} refreshing={me.loading && !!m} onRefresh={() => { me.reload(); invalidate('me:'); }} contentStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}>
      {!m ? (
        me.error ? <T style={{ color: t.mut, textAlign: 'center', marginTop: 32 }}>{me.error.message}</T> : <ActivityIndicator color={t.p} style={{ marginTop: 32 }} />
      ) : (
        <>
          <Pressable onLongPress={() => router.push('/theme-lab')} delayLongPress={600} accessibilityHint="Long-press to open the theme lab"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 24, backgroundImage: t.aura('140%', t.card) }}>
            <View style={{ borderRadius: 35, borderWidth: 3, borderColor: t.s }}>
              <Avatar size={64} initials={m.name.split(' ').map((w) => w[0]).join('').slice(0, 2)} photo={m.photos[0]} onSurface />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <D style={{ fontSize: 22, lineHeight: 27 }}>{m.name}</D>
              <T style={{ fontSize: 13.5, color: t.mut, marginTop: 2 }}>{[m.age, m.sect, m.subSect].filter(Boolean).join(' · ')}</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: alpha(t.s, 0.7), overflow: 'hidden' }}>
                  <View style={{ width: `${m.completeness}%`, height: '100%', borderRadius: 3, backgroundImage: t.accentBar }} />
                </View>
                <T style={{ fontSize: 12.5, fontWeight: '600' }}>{m.completeness}%</T>
              </View>
            </View>
          </Pressable>

          <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 20, backgroundColor: t.card, boxShadow: t.cardShadow }}>
            {m.photos.slice(0, 2).map((p) => <Image key={p} source={{ uri: p }} style={{ width: 64, height: 80, borderRadius: 12 }} resizeMode="cover" />)}
            {m.photos.length < 6 && (
              <Pressable onPress={addPhoto} accessibilityLabel="Add a photo" style={{ width: 64, height: 80, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.outline, alignItems: 'center', justifyContent: 'center' }}>
                {uploading ? <ActivityIndicator color={t.p} /> : <Icon name="add_a_photo" size={24} color={t.p} />}
              </Pressable>
            )}
            <View style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name={m.photosLocked ? 'lock' : 'lock_open'} size={16} color={t.ink} />
                <T style={{ fontSize: 14, fontWeight: '600' }}>{m.photosLocked ? 'Private' : 'Visible'}</T>
              </View>
              <T style={{ fontSize: 12.5, lineHeight: 17, color: t.mut, marginTop: 2 }}>
                {m.photosLocked ? `${viewers.data ?? 0} ${viewers.data === 1 ? 'person' : 'people'} can see them` : 'Everyone can see them'}
              </T>
            </View>
          </View>

          {groups.map((g) => (
            <View key={g.title} style={{ marginTop: 24 }}>
              <SectionTitle>{g.title}</SectionTitle>
              <View style={{ backgroundColor: t.grpBg, borderRadius: t.grpR, overflow: 'hidden' }}>
                {g.rows.map((r, i) => {
                  const tileColor = r.danger ? DANGER_TILE : TILE[tile++ % TILE.length]!;
                  const fg = r.danger ? t.bad : t.ink;
                  return (
                    <Pressable key={r.t} onPress={r.sw ? () => r.toggle?.(!r.on) : r.onPress} disabled={!r.onPress && !r.sw} android_ripple={{ color: t.line }}
                      accessibilityRole={r.sw ? 'switch' : 'button'}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52, paddingHorizontal: t.grpPx }}>
                      {isIOS ? (
                        <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: tileColor, alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name={r.icon} size={19} color="#FFFFFF" />
                        </View>
                      ) : (
                        <Icon name={r.icon} size={24} color={r.danger ? t.bad : t.mut} />
                      )}
                      <View style={{ flex: 1, minWidth: 0, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: i && isIOS ? 0.5 : 0, borderColor: t.line }}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <T style={{ fontSize: 16, color: fg }}>{r.t}</T>
                          {r.d && <T style={{ fontSize: 13, color: t.mut, marginTop: 1 }}>{r.d}</T>}
                        </View>
                        {r.value && <T style={{ fontSize: 15, color: t.mut }}>{r.value}</T>}
                        {r.chev && <Icon name="chevron_right" size={22} color={t.mut} />}
                        {r.sw && <Switch on={!!r.on} onChange={(v) => r.toggle?.(v)} label={r.t} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          <Pressable onPress={() => signOut()} accessibilityRole="button" style={{ height: t.btnH, marginTop: 24, borderRadius: t.btnR, backgroundColor: isAndroid ? 'transparent' : t.grpBg, alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ color: t.bad, fontSize: 16, fontWeight: '500' }}>Log out</T>
          </Pressable>
        </>
      )}
      <M3Dialog open={del} onClose={() => setDel(false)} icon="delete" danger title="Delete account?" body="Your profile, photos and chats will be erased. This can't be undone." confirm="Delete" onConfirm={doDelete} />
    </Screen>
  );
}
