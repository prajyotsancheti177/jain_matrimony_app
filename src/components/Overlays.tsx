import { BlurView } from 'expo-blur';
import { useSegments } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Dimensions, KeyboardAvoidingView, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../lib/stores';
import { useAndroidKeyboardHeight } from '../lib/keyboard';
import { alpha, isAndroid, isIOS, useTheme } from '../theme';
import { Button, TextButton } from './Controls';
import { Icon, type IconName } from './Icon';
import { T } from './Text';

const SCRIM = 'rgba(20,12,40,0.38)';

/** Modal shell: fading scrim + content that slides up (sheet) or fades in (dialog). */
function Layer({ open, onClose, kind, children }: { open: boolean; onClose: () => void; kind: 'sheet' | 'dialog'; children: ReactNode }) {
  const [mounted, setMounted] = useState(open);
  const [a] = useState(() => new Animated.Value(0));
  const keyboard = useAndroidKeyboardHeight();
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    Animated.timing(a, { toValue: open ? 1 : 0, duration: open ? 260 : 200, useNativeDriver: true }).start(() => {
      if (!open) setMounted(false);
    });
  }, [open, a]);
  if (!mounted) return null;
  const h = Dimensions.get('window').height;
  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent onRequestClose={onClose} animationType="none">
      <Animated.View style={{ position: 'absolute', inset: 0, backgroundColor: SCRIM, opacity: a }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <KeyboardAvoidingView enabled={isIOS} behavior="padding" style={{ flex: 1, justifyContent: kind === 'sheet' ? 'flex-end' : 'center', paddingBottom: keyboard }} pointerEvents="box-none">
        <Animated.View
          style={
            kind === 'sheet'
              ? { maxHeight: '88%', transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [h * 0.6, 0] }) }] }
              : { opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1.08, 1] }) }] }
          }
        >
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Bottom sheet. iOS: grabber + Cancel / title / action in the top row.
 * Android: Material modal bottom sheet with drag handle, title, and a full-width button.
 */
export function Sheet({
  open, onClose, title, cta, ctaLong, onSubmit, busy, children,
}: { open: boolean; onClose: () => void; title: string; cta?: string; ctaLong?: string; onSubmit?: () => void; busy?: boolean; children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Layer open={open} onClose={onClose} kind="sheet">
      <View style={{ borderTopLeftRadius: isIOS ? 14 : 28, borderTopRightRadius: isIOS ? 14 : 28, backgroundColor: isIOS ? t.bg : t.tonal(6), overflow: 'hidden' }}>
        {isIOS ? (
          <>
            <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: t.line, marginTop: 6, alignSelf: 'center' }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingBottom: 4, paddingHorizontal: 16 }}>
              <View style={{ flex: 1, alignItems: 'flex-start' }}><TextButton label="Cancel" onPress={onClose} /></View>
              <T style={{ fontSize: 17, fontWeight: '600' }}>{title}</T>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>{cta && onSubmit && <TextButton label={busy ? '…' : cta} bold onPress={busy ? undefined : onSubmit} />}</View>
            </View>
          </>
        ) : (
          <>
            <View style={{ width: 32, height: 4, borderRadius: 2, backgroundColor: t.outline, marginTop: 16, marginBottom: 14, alignSelf: 'center' }} />
            <T style={{ paddingHorizontal: 24, paddingBottom: 4, fontSize: 22 }}>{title}</T>
          </>
        )}
        <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
          {children}
          {isAndroid && ctaLong && onSubmit && (
            <View style={{ paddingTop: 12, paddingHorizontal: 20 }}>
              <Button label={ctaLong} onPress={onSubmit} busy={busy} height={48} fontSize={15} />
            </View>
          )}
          <View style={{ height: 30 + insets.bottom * (isIOS ? 0 : 1) }} />
        </ScrollView>
      </View>
    </Layer>
  );
}

/** Android bottom-sheet list of actions (the iOS equivalent is the native action sheet). */
export function ActionListSheet({ open, onClose, title, rows }: { open: boolean; onClose: () => void; title: string; rows: { icon: IconName; label: string; danger?: boolean; onPress: () => void }[] }) {
  const t = useTheme();
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <View style={{ paddingTop: 4, paddingBottom: 8 }}>
        {rows.map((r) => (
          <Pressable key={r.label} onPress={r.onPress} android_ripple={{ color: t.line }} style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24 }}>
            <Icon name={r.icon} size={24} color={r.danger ? t.bad : t.ink} />
            <T style={{ fontSize: 16, color: r.danger ? t.bad : t.ink }}>{r.label}</T>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

/** Material 3 dialog with a leading icon (used for delete on Android; iOS uses the native alert). */
export function M3Dialog({ open, onClose, icon, title, body, confirm, onConfirm, danger }: { open: boolean; onClose: () => void; icon?: IconName; title: string; body: string; confirm: string; onConfirm: () => void; danger?: boolean }) {
  const t = useTheme();
  return (
    <Layer open={open} onClose={onClose} kind="dialog">
      <View style={{ marginHorizontal: 24, borderRadius: 28, backgroundColor: t.tonal(6), padding: 24 }}>
        {icon && <View style={{ alignItems: 'center', marginBottom: 16 }}><Icon name={icon} size={24} color={danger ? t.bad : t.p} /></View>}
        <T style={{ fontSize: 24, textAlign: icon ? 'center' : 'left', marginBottom: 16 }}>{title}</T>
        <T style={{ fontSize: 14, lineHeight: 20, color: t.mut }}>{body}</T>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
          <TextButton label="Cancel" size={14} onPress={onClose} />
          <TextButton label={confirm} size={14} color={danger ? t.bad : t.p} onPress={onConfirm} />
        </View>
      </View>
    </Layer>
  );
}

/** Wraps a picker so iOS shows it in a bottom panel with Cancel / title / Done. */
export function IosPickerSheet({ open, onClose, onDone, title, children }: { open: boolean; onClose: () => void; onDone: () => void; title: string; children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Layer open={open} onClose={onClose} kind="sheet">
      <View style={{ backgroundColor: t.s, borderTopLeftRadius: 14, borderTopRightRadius: 14, paddingBottom: Math.max(34, insets.bottom) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: 0.5, borderColor: t.line }}>
          <View style={{ flex: 1, alignItems: 'flex-start' }}><TextButton label="Cancel" onPress={onClose} /></View>
          <T style={{ fontSize: 17, fontWeight: '600' }}>{title}</T>
          <View style={{ flex: 1, alignItems: 'flex-end' }}><TextButton label="Done" bold onPress={onDone} /></View>
        </View>
        {children}
      </View>
    </Layer>
  );
}

/** Toasts: iOS banner at the top, Android snackbar above the navigation bar / FAB. */
export function ToastHost() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast((s) => s.toast);
  const segments = useSegments() as string[];
  const [a] = useState(() => new Animated.Value(0));
  const [shown, setShown] = useState(toast);
  if (toast && toast !== shown) setShown(toast);
  useEffect(() => {
    Animated.timing(a, { toValue: toast ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [toast, a]);
  if (!shown) return null;
  if (isIOS) {
    return (
      <Animated.View pointerEvents="none" accessibilityLiveRegion="polite"
        style={{ position: 'absolute', top: insets.top + 4, left: 12, right: 12, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }], borderRadius: 22, overflow: 'hidden', boxShadow: '0px 10px 30px -8px rgba(0,0,0,0.25)' }}>
        <BlurView intensity={50} tint={t.dark ? 'dark' : 'light'} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: alpha(t.s, 0.92) }}>
          <Icon name={shown.icon} size={22} color={t.p} fill />
          <T style={{ flex: 1, fontSize: 14.5, fontWeight: '500', lineHeight: 20 }}>{shown.msg}</T>
        </BlurView>
      </Animated.View>
    );
  }
  const inTabs = segments[0] === '(tabs)';
  const aboveFab = segments[0] === 'profile';
  const bottom = insets.bottom + (inTabs ? 90 : aboveFab ? 82 : 18);
  return (
    <Animated.View pointerEvents="none" accessibilityLiveRegion="polite"
      style={{ position: 'absolute', bottom, left: 12, right: 12, opacity: a, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 4, backgroundColor: t.ink, boxShadow: '0px 4px 12px rgba(0,0,0,0.2)' }}>
      <T style={{ color: t.bg, fontSize: 14, lineHeight: 20 }}>{shown.msg}</T>
    </Animated.View>
  );
}
