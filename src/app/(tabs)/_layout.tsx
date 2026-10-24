import { BlurView } from 'expo-blur';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/Icon';
import { T } from '../../components/Text';
import { alpha, isIOS, mix, useTheme } from '../../theme';

const TABS: Record<string, { icon: IconName; label: string }> = {
  matches: { icon: 'local_florist', label: 'Matches' },
  interests: { icon: 'favorite', label: 'Interests' },
  chats: { icon: 'forum', label: 'Chats' },
  me: { icon: 'person', label: 'Profile' },
};

/** iOS: translucent tab bar. Android: Material navigation bar with an active pill. */
function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const items = state.routes.map((r, i) => {
    const tab = TABS[r.name]!;
    const active = state.index === i;
    const onPress = () => !active && navigateToTab(r.key);
    return { key: r.key, ...tab, active, onPress };
  });

  if (isIOS) {
    return (
      <View style={{ borderTopWidth: 0.5, borderColor: t.line, backgroundColor: alpha(t.s, 0.88), overflow: 'hidden' }}>
        <BlurView intensity={40} tint={t.dark ? 'dark' : 'light'} style={{ position: 'absolute', inset: 0 }} />
        <View style={{ flexDirection: 'row', paddingTop: 6, height: 50 + Math.max(insets.bottom, 8) }}>
          {items.map((it) => (
            <Pressable key={it.key} onPress={it.onPress} accessibilityRole="tab" accessibilityState={{ selected: it.active }} accessibilityLabel={it.label} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
              <Icon name={it.icon} size={26} color={it.active ? t.p : t.mut} fill={it.active} />
              <T style={{ fontSize: 10, fontWeight: '500', color: it.active ? t.p : t.mut }}>{it.label}</T>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', height: 80 + insets.bottom, paddingBottom: insets.bottom, backgroundColor: mix(t.p, 8, t.s) }}>
      {items.map((it) => (
        <Pressable key={it.key} onPress={it.onPress} accessibilityRole="tab" accessibilityState={{ selected: it.active }} accessibilityLabel={it.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <View style={{ width: 64, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: it.active ? mix(t.p, 20, t.s) : 'transparent' }}>
            <Icon name={it.icon} size={24} color={it.active ? t.ink : t.mut} fill={it.active} />
          </View>
          <T style={{ fontSize: 12, fontWeight: it.active ? '600' : '500', color: it.active ? t.ink : t.mut }}>{it.label}</T>
        </Pressable>
      ))}
    </View>
  );
}

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.bg } }}>
      <Tabs.Screen name="matches" />
      <Tabs.Screen name="interests" />
      <Tabs.Screen name="chats" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
