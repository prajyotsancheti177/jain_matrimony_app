// 2m · Conversation.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { FlatList, KeyboardAvoidingView, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type Conversation, type Message } from '../../api';
import { Header } from '../../components/Screen';
import { Icon } from '../../components/Icon';
import { useSafety } from '../../components/Safety';
import { T } from '../../components/Text';
import { invalidate, setQueryData, useQuery } from '../../lib/query';
import { toastError } from '../../lib/stores';
import { isIOS, useTheme } from '../../theme';

export default function Chat() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const chats = useQuery('chats', () => api.conversations());
  const conv = chats.data?.find((c) => c.id === id);
  const msgs = useQuery(`messages:${id}`, () => api.messages(id));
  const [draft, setDraft] = useState('');
  const list = useRef<ComponentRef<typeof FlatList<Message>>>(null);
  const openProfile = conv ? () => router.push(`/profile/${conv.other.id}`) : undefined;
  const safety = useSafety(conv ? { id: conv.other.id, name: conv.other.name } : null, () => router.back(), openProfile);

  useEffect(() => {
    api.markRead(id).then(() => setQueryData<Conversation[]>('chats', (l) => (l ?? []).map((c) => (c.id === id ? { ...c, unread: 0 } : c))));
    return api.subscribe(id, (m) => {
      setQueryData<Message[]>(`messages:${id}`, (l) => [...(l ?? []), m]);
      api.markRead(id);
    });
  }, [id]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    const temp: Message = { id: `tmp-${Date.now()}`, text, mine: true, at: new Date().toISOString(), read: false };
    setQueryData<Message[]>(`messages:${id}`, (l) => [...(l ?? []), temp]);
    try {
      const saved = await api.sendMessage(id, text);
      setQueryData<Message[]>(`messages:${id}`, (l) => (l ?? []).map((m) => (m.id === temp.id ? saved : m)));
      invalidate('chats');
    } catch (e) {
      setQueryData<Message[]>(`messages:${id}`, (l) => (l ?? []).filter((m) => m.id !== temp.id));
      setDraft(text);
      toastError(e);
    }
  };

  const data = msgs.data ?? [];
  // Show "Delivered" / "Read" under my latest message, like the design.
  const lastMine = [...data].reverse().find((m) => m.mine);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ paddingTop: insets.top }}>
        <Header title={conv?.other.name ?? ''} onTitlePress={openProfile} back={{ label: 'Chats' }} action={{ icon: isIOS ? 'more_horiz' : 'more_vert', label: 'More', onPress: safety.open }} />
      </View>
      {/* Edge to edge on Android: the window doesn't resize for the keyboard, so pad on both platforms. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <FlatList
          ref={list}
          data={data}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 14, gap: 6 }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: t.soft, marginBottom: 8 }}>
              <Icon name="favorite" size={15} color={t.p} />
              <T style={{ color: t.p, fontSize: 12.5, fontWeight: '500' }}>You both said yes</T>
            </View>
          }
          renderItem={({ item: m }) =>
            m.mine ? (
              <View style={{ alignSelf: 'flex-end', maxWidth: '78%', alignItems: 'flex-end', gap: 3 }}>
                <View style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, borderBottomRightRadius: 6, backgroundColor: t.p }}>
                  <T style={{ color: t.op, fontSize: 15, lineHeight: 21 }}>{m.text}</T>
                </View>
                {m.id === lastMine?.id && <T style={{ fontSize: 12, color: t.mut }}>{m.id.startsWith('tmp-') ? 'Sending…' : m.read ? 'Read' : 'Delivered'}</T>}
              </View>
            ) : (
              <View style={{ alignSelf: 'flex-start', maxWidth: '78%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, borderBottomLeftRadius: 6, backgroundColor: t.s, boxShadow: '0px 2px 6px -3px rgba(0,0,0,0.12)' }}>
                <T style={{ fontSize: 15, lineHeight: 21 }}>{m.text}</T>
              </View>
            )
          }
        />
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, paddingBottom: 8 + insets.bottom, backgroundColor: t.bg, borderTopWidth: 0.5, borderColor: t.line }}>
          {conv && !conv.active ? (
            <T style={{ flex: 1, textAlign: 'center', color: t.mut, fontSize: 14, paddingVertical: 12 }}>This chat is closed.</T>
          ) : (
            <>
              <TextInput value={draft} onChangeText={setDraft} placeholder="Message" placeholderTextColor={t.mut} selectionColor={t.p} onSubmitEditing={send} returnKeyType="send" maxLength={1000}
                style={{ flex: 1, height: 44, borderRadius: 22, backgroundColor: t.s, paddingHorizontal: 16, fontSize: 15.5, color: t.ink }} />
              <Pressable onPress={send} accessibilityLabel="Send" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.p, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={isIOS ? 'arrow_upward' : 'send'} size={22} color={t.op} fill />
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
      {safety.element}
    </View>
  );
}
