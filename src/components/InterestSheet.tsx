// 2j · Send interest. iOS: sheet with Cancel / Send. Android: modal bottom sheet with a full-width button.
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { api, type Profile } from '../api';
import { invalidate } from '../lib/query';
import { toast, toastError } from '../lib/stores';
import { isIOS, useTheme } from '../theme';
import { Avatar, Switch } from './Controls';
import { Icon } from './Icon';
import { Sheet } from './Overlays';
import { Petals } from './Score';
import { D, T } from './Text';

const SUGGESTIONS = ['Jai Jinendra! Would our families like to talk?', 'We seem to share a lot. Want to connect?', 'Our families are both from Gujarat.'];

export function InterestSheet({ m, open, onClose }: { m: Profile | null; open: boolean; onClose: () => void }) {
  const t = useTheme();
  const [note, setNote] = useState('');
  const [grant, setGrant] = useState(true);
  const [busy, setBusy] = useState(false);
  // Start fresh each time the sheet opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setNote('');
      setGrant(true);
    }
  }
  if (!m) return null;

  const send = async () => {
    setBusy(true);
    try {
      await api.sendInterest(m.id, note, grant);
      invalidate('interests:sent');
      onClose();
      toast(`Interest sent to ${m.first}`, 'favorite');
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const fieldR = isIOS ? 16 : 12;
  return (
    <Sheet open={open} onClose={onClose} title="Send interest" cta="Send" ctaLong="Send interest" onSubmit={send} busy={busy}>
      <View style={{ paddingTop: 10, paddingHorizontal: 16, paddingBottom: 4, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22, backgroundImage: t.aura('140%') }}>
          <Avatar size={58} initials={m.initials} photo={m.photo} onSurface />
          <View style={{ flex: 1, minWidth: 0 }}>
            <D style={{ fontSize: 21, lineHeight: 25 }}>{m.name}</D>
            <T style={{ fontSize: 13.5, color: t.mut, marginTop: 2 }}>{[m.age, m.cityShort].filter(Boolean).join(' · ')}</T>
          </View>
          {m.score && (t.score === 'petals' ? (
            <Petals rows={m.score.rows} size={56} total={m.score.total} />
          ) : (
            <View style={{ height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: t.s, justifyContent: 'center' }}>
              <T style={{ color: t.p, fontSize: 15, fontWeight: '700' }}>{m.score.total}%</T>
            </View>
          ))}
        </View>

        <View style={{ borderRadius: fieldR, borderWidth: isIOS ? 0 : 1, borderColor: t.outline, backgroundColor: isIOS ? t.s : 'transparent', paddingTop: 12, paddingHorizontal: 14, paddingBottom: 8 }}>
          <TextInput
            value={note}
            onChangeText={(v) => setNote(v.slice(0, 300))}
            multiline
            maxLength={300}
            placeholder={`Write a note to ${m.first} (optional)`}
            placeholderTextColor={t.mut}
            selectionColor={t.p}
            style={{ height: 84, fontSize: 15.5, lineHeight: 22, color: t.ink, textAlignVertical: 'top', padding: 0 }}
          />
          <T style={{ textAlign: 'right', fontSize: 12, color: t.mut }}>{note.length}/300</T>
        </View>

        <View style={{ gap: 8 }}>
          <T style={{ fontSize: 13, fontWeight: '500', color: t.mut, paddingLeft: 4 }}>Or start with</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 2, paddingBottom: 4 }}>
            {SUGGESTIONS.map((s) => {
              const on = note === s;
              return (
                <Pressable key={s} onPress={() => setNote(on ? '' : s)} accessibilityState={{ selected: on }}
                  style={{ width: 200, gap: 6, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, borderWidth: 2, borderColor: on ? t.p : 'transparent', backgroundColor: on ? t.soft : isIOS ? t.s : t.card }}>
                  <Icon name="format_quote" size={20} color={t.p} fill />
                  <T style={{ fontSize: 14, lineHeight: 20 }}>{s}</T>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: fieldR, backgroundColor: isIOS ? t.s : 'transparent', borderWidth: isIOS ? 0 : 1, borderColor: t.line }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={grant ? 'lock_open' : 'lock'} size={20} color={t.p} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T style={{ fontSize: 15.5, fontWeight: '500' }}>Share my photos</T>
            <T style={{ fontSize: 12.5, color: t.mut, marginTop: 1 }}>{grant ? `${m.first} can see them right away` : 'Locked until you allow'}</T>
          </View>
          <Switch on={grant} onChange={setGrant} label="Share my photos" />
        </View>
      </View>
    </Sheet>
  );
}
