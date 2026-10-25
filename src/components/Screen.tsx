import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Pressable, RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAndroidKeyboardHeight } from '../lib/keyboard';
import { alpha, isAndroid, isIOS, useTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { T } from './Text';

export type HeaderProps = {
  title?: string;
  /** iOS large title (tab roots). Android always uses the 64dp top app bar. */
  large?: boolean;
  back?: { label?: string; onPress?: () => void } | false;
  action?: { icon: IconName; onPress: () => void; label: string };
  /** Header sits on the aura with no fill or hairline (sign-in, onboarding, breakdown, tab roots). */
  clear?: boolean;
  /** Makes the title a button (e.g. a chat's name opens that person's profile). */
  onTitlePress?: () => void;
};

/** The soft two-colour glow behind the top of a screen. */
export function Aura({ height = 260 }: { height?: number }) {
  const t = useTheme();
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, height,
        backgroundImage: `radial-gradient(90% 100% at 0% 0%, ${t.g1}, transparent 70%), radial-gradient(80% 90% at 100% 10%, ${t.g2}, transparent 70%)`,
      }}
    />
  );
}

export function Header({ title = '', large, back, action, clear, onTitlePress }: HeaderProps) {
  const t = useTheme();
  const goBack = back ? (back.onPress ?? (() => router.back())) : undefined;
  if (isIOS && large) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 6, paddingBottom: 10, paddingHorizontal: 16 }}>
        <T accessibilityRole="header" style={{ fontSize: 34, fontWeight: '700', letterSpacing: -0.6, lineHeight: 40 }}>{title}</T>
        {action && (
          <Pressable onPress={action.onPress} accessibilityLabel={action.label} style={{ width: 44, height: 44, marginBottom: -2, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(t.s, 0.7) }}>
            <Icon name={action.icon} size={22} color={t.p} />
          </Pressable>
        )}
      </View>
    );
  }
  if (isIOS) {
    return (
      <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', paddingRight: 8, borderBottomWidth: clear ? 0 : 0.5, borderColor: t.line, backgroundColor: clear ? 'transparent' : t.bg }}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {goBack && (
            <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel={back && back.label ? back.label : 'Back'} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', height: 44, paddingRight: 8, opacity: pressed ? 0.5 : 1 })}>
              <Icon name="chevron_left" size={34} color={t.p} />
              <T style={{ color: t.p, fontSize: 17, marginLeft: -6 }}>{(back && back.label) || 'Back'}</T>
            </Pressable>
          )}
        </View>
        <Pressable onPress={onTitlePress} disabled={!onTitlePress} accessibilityRole={onTitlePress ? 'button' : 'header'} accessibilityHint={onTitlePress ? 'Opens their profile' : undefined}
          style={({ pressed }) => ({ maxWidth: 180, flexDirection: 'row', alignItems: 'center', gap: 2, opacity: pressed ? 0.6 : 1 })}>
          <T numberOfLines={1} style={{ fontSize: 17, fontWeight: '600', flexShrink: 1 }}>{title}</T>
          {onTitlePress && <Icon name="chevron_right" size={18} color={t.mut} />}
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end' }}>
          {action && (
            <Pressable onPress={action.onPress} accessibilityLabel={action.label} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={action.icon} size={26} color={t.p} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }
  return (
    <View style={{ height: 64, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4, backgroundColor: clear ? 'transparent' : t.bg }}>
      {goBack && (
        <Pressable onPress={goBack} accessibilityLabel="Back" android_ripple={{ color: t.line, borderless: true, radius: 24 }} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrow_back" size={24} color={t.ink} />
        </Pressable>
      )}
      <Pressable onPress={onTitlePress} disabled={!onTitlePress} accessibilityRole={onTitlePress ? 'button' : 'header'} accessibilityHint={onTitlePress ? 'Opens their profile' : undefined}
        style={({ pressed }) => ({ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: goBack ? 4 : 16, opacity: pressed ? 0.6 : 1 })}>
        <T numberOfLines={1} style={{ fontSize: 22, flexShrink: 1 }}>{title}</T>
        {onTitlePress && <Icon name="chevron_right" size={22} color={t.mut} />}
      </Pressable>
      {action && (
        <Pressable onPress={action.onPress} accessibilityLabel={action.label} android_ripple={{ color: t.line, borderless: true, radius: 24 }} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={action.icon} size={24} color={t.ink} />
        </Pressable>
      )}
    </View>
  );
}

/**
 * A full screen: background, optional aura, header, scrolling body and an optional footer.
 * `fill` makes the body stretch so a bottom button can sit at the end (sign-in and onboarding layouts).
 */
export function Screen({
  header, aura, children, footer, overlay, scroll = true, fill, contentStyle, refreshing, onRefresh, tabRoot,
}: {
  header?: HeaderProps | false; aura?: boolean; children: ReactNode; footer?: ReactNode; overlay?: ReactNode; scroll?: boolean; fill?: boolean;
  contentStyle?: StyleProp<ViewStyle>; refreshing?: boolean; onRefresh?: () => void; tabRoot?: boolean;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useAndroidKeyboardHeight();
  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[fill && { flexGrow: 1 }, { paddingBottom: footer || tabRoot ? 0 : insets.bottom }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.p} colors={[t.p]} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {aura && <Aura />}
      <View style={{ paddingTop: insets.top }}>{header && <Header {...header} />}</View>
      {isIOS ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          {body}
          {footer}
        </KeyboardAvoidingView>
      ) : (
        // Edge to edge: Android doesn't resize the window for the keyboard, so make the room here.
        <View style={{ flex: 1, paddingBottom: keyboard }}>
          {body}
          {footer}
        </View>
      )}
      {overlay}
    </View>
  );
}

/** Pinned bottom bar. iOS: translucent with a hairline. Android: plain background. */
export function StickyFooter({ children, blur = isIOS }: { children: ReactNode; blur?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const inner = <View style={{ paddingTop: 10, paddingHorizontal: 16, paddingBottom: Math.max(12, insets.bottom) }}>{children}</View>;
  if (blur && !isAndroid) {
    return (
      <View style={{ borderTopWidth: 0.5, borderColor: t.line, backgroundColor: alpha(t.bg, 0.88), overflow: 'hidden' }}>
        <BlurView intensity={40} tint={t.dark ? 'dark' : 'light'} style={{ position: 'absolute', inset: 0 }} />
        {inner}
      </View>
    );
  }
  return <View style={{ borderTopWidth: 0.5, borderColor: t.line, backgroundColor: t.bg }}>{inner}</View>;
}

/** Section header above a grouped list (iOS uppercase grey; Android primary-coloured). */
export function SectionTitle({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[{ marginBottom: 6, marginLeft: t.grpPx }, style]}>
      <T style={t.sectionHeader}>{children}</T>
    </View>
  );
}

/** Field label used above inputs and chip groups. */
export function FieldLabel({ children, gap = 6 }: { children: string; gap?: number }) {
  const t = useTheme();
  return <T style={{ fontSize: 13, color: t.mut, marginBottom: gap, marginLeft: 4 }}>{children}</T>;
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const t = useTheme();
  const s: StyleProp<ViewStyle> = [{ backgroundColor: t.card, borderRadius: 22, boxShadow: t.cardShadow }, style];
  return onPress ? <Pressable onPress={onPress} style={s}>{children}</Pressable> : <View style={s}>{children}</View>;
}

export function Empty({ icon, text }: { icon: IconName; text: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 24 }}>
      <Icon name={icon} size={36} color={t.p} />
      <T style={{ color: t.mut, textAlign: 'center', fontSize: 15, lineHeight: 21 }}>{text}</T>
    </View>
  );
}
