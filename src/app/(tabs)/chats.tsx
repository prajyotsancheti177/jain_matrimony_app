// 2l · Chats.
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '../../api';
import { Avatar } from '../../components/Controls';
import { Icon } from '../../components/Icon';
import { Empty, Screen } from '../../components/Screen';
import { T } from '../../components/Text';
import { useQuery } from '../../lib/query';
import { useTheme } from '../../theme';

export default function Chats() {
  const t = useTheme();
  const q = useQuery('chats', () => api.conversations());
  const { reload } = q;
  useFocusEffect(useCallback(() => void reload(), [reload]));

  return (
    <Screen aura tabRoot header={{ title: 'Chats', large: true, clear: true }} refreshing={q.loading && !!q.data} onRefresh={q.reload} contentStyle={{ paddingBottom: 24 }}>
      <View style={{ marginHorizontal: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="lock" size={17} color={t.mut} />
        <T style={{ fontSize: 13.5, color: t.mut }}>Chats open after an interest is accepted.</T>
      </View>
      {q.error && !q.data && <Empty icon="error" text={q.error.message} />}
      {q.data?.length === 0 && <Empty icon="forum" text="No chats yet. Accept an interest to start one." />}
      {q.data?.map((c) => (
        <Pressable key={c.id} onPress={() => router.push(`/chat/${c.id}`)} accessibilityRole="button" accessibilityLabel={`Chat with ${c.other.name}${c.unread ? `, ${c.unread} unread` : ''}`}
          android_ripple={{ color: t.line }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: 16, opacity: isPressedFade(pressed) })}>
          <Avatar size={56} initials={c.other.initials} photo={c.other.photo} />
          <View style={{ flex: 1, minWidth: 0, borderBottomWidth: 1, borderColor: t.line, paddingTop: 6, paddingBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <T style={{ fontSize: 16.5, fontWeight: '600' }}>{c.other.name}</T>
              <T style={{ fontSize: 13, color: t.mut }}>{c.time}</T>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 3 }}>
              <T numberOfLines={1} style={{ flex: 1, fontSize: 14.5, color: t.mut }}>{c.last}</T>
              {c.unread > 0 && (
                <View style={{ minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: t.p, alignItems: 'center', justifyContent: 'center' }}>
                  <T style={{ color: t.op, fontSize: 12, fontWeight: '600' }}>{c.unread}</T>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

const isPressedFade = (pressed: boolean) => (pressed ? 0.6 : 1);
