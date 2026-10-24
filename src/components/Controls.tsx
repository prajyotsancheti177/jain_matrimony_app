import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Image, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { isAndroid, isIOS, mix, useTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { D, T } from './Text';

type BtnKind = 'primary' | 'soft' | 'plain' | 'ground';

/** Filled button. iOS: 14px radius, 50 tall. Android: pill, 48 tall. */
export function Button({
  label, onPress, kind = 'primary', icon, iconRight, iconFill = false, disabled, busy, height, fontSize = 16, style,
}: {
  label: string; onPress?: () => void; kind?: BtnKind; icon?: IconName; iconRight?: IconName; iconFill?: boolean;
  disabled?: boolean; busy?: boolean; height?: number; fontSize?: number; style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const bg = kind === 'primary' ? t.p : kind === 'soft' ? t.soft : kind === 'ground' ? t.bg : 'transparent';
  const fg = kind === 'primary' ? t.op : kind === 'ground' ? t.ink : t.p;
  return (
    <Pressable
      onPress={disabled || busy ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        {
          height: height ?? t.btnH, borderRadius: t.btnR, backgroundColor: bg, flexDirection: 'row', alignItems: 'center',
          justifyContent: 'center', gap: 6, paddingHorizontal: 16, opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={18} color={fg} fill={iconFill} />}
          <T style={{ color: fg, fontSize, fontWeight: '600' }}>{label}</T>
          {iconRight && <Icon name={iconRight} size={20} color={fg} />}
        </>
      )}
    </Pressable>
  );
}

/** Text-only button (iOS nav-bar actions, dialog actions). */
export function TextButton({ label, onPress, color, bold, size = 17, style }: { label: string; onPress?: () => void; color?: string; bold?: boolean; size?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [{ height: 44, justifyContent: 'center', paddingHorizontal: isAndroid ? 12 : 0, opacity: pressed ? 0.5 : 1 }, style]}>
      <T style={{ color: color ?? t.p, fontSize: size, fontWeight: bold ? '600' : isAndroid ? '500' : '400' }}>{label}</T>
    </Pressable>
  );
}

/** Filter/choice chip. iOS: capsule, filled when on. Android: 8dp filter chip with a check. */
export function Chip({ label, on, onPress, height = 36 }: { label: string; on: boolean; onPress: () => void; height?: number }) {
  const t = useTheme();
  const bg = isAndroid ? (on ? mix(t.p, 18, t.s) : 'transparent') : on ? t.p : t.s;
  const fg = isAndroid ? t.ink : on ? t.op : t.ink;
  const bd = isAndroid ? (on ? 'transparent' : t.outline) : on ? t.p : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={isAndroid ? 'checkbox' : 'button'}
      accessibilityState={{ checked: on, selected: on }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height, paddingHorizontal: 14, paddingLeft: isAndroid && on ? 10 : 14, borderRadius: t.chipR, borderWidth: 1, borderColor: bd, backgroundColor: bg }}
    >
      {isAndroid && on && <Icon name="check" size={18} color={fg} />}
      <T style={{ color: fg, fontSize: 14, fontWeight: '500' }}>{label}</T>
    </Pressable>
  );
}

export function ChipGroup({ options, value, onChange, multi = false }: { options: string[]; value: string[]; onChange: (v: string[]) => void; multi?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => (
        <Chip key={o} label={o} on={value.includes(o)} onPress={() => onChange(multi ? (value.includes(o) ? value.filter((x) => x !== o) : [...value, o]) : [o])} />
      ))}
    </View>
  );
}

/** iOS segmented control / Android segmented button (with a check on the selected segment). */
export function Segmented({ options, value, onChange, fontSize = 14 }: { options: string[]; value: string; onChange: (v: string) => void; fontSize?: number }) {
  const t = useTheme();
  if (isIOS) {
    return (
      <View style={{ flexDirection: 'row', padding: 2, borderRadius: 9, backgroundColor: mix(t.ink, 8, t.bg) }}>
        {options.map((o) => {
          const on = o === value;
          return (
            <Pressable key={o} onPress={() => onChange(o)} accessibilityRole="tab" accessibilityState={{ selected: on }}
              style={{ flex: 1, height: 32, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.s : 'transparent', boxShadow: on ? '0px 1px 3px rgba(0,0,0,0.12)' : undefined }}>
              <T style={{ fontSize, fontWeight: '500' }}>{o}</T>
            </Pressable>
          );
        })}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: t.outline, borderRadius: 999, overflow: 'hidden' }}>
      {options.map((o, i) => {
        const on = o === value;
        return (
          <Pressable key={o} onPress={() => onChange(o)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={{ flex: 1, height: 48, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderLeftWidth: i ? 1 : 0, borderColor: t.outline, backgroundColor: on ? mix(t.p, 18, t.s) : 'transparent' }}>
            {on && <Icon name="check" size={18} color={t.ink} />}
            <T style={{ fontSize: 14, fontWeight: '500' }}>{o}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Android primary tabs (text + 3px indicator). */
export function Tabs({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: t.line }}>
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable key={o} onPress={() => onChange(o)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ height: 48, justifyContent: 'center' }}>
              <T style={{ fontSize: 14, fontWeight: '500', color: on ? t.p : t.mut }}>{o}</T>
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: on ? t.p : 'transparent' }} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** iOS switch (51×31) / Material 3 switch with a check in the thumb. */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  const t = useTheme();
  const [a] = useState(() => new Animated.Value(on ? 1 : 0));
  useEffect(() => {
    Animated.timing(a, { toValue: on ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [on, a]);
  const press = () => onChange(!on);
  if (isIOS) {
    return (
      <Pressable onPress={press} accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on }}
        style={{ width: 51, height: 31, borderRadius: 16, backgroundColor: on ? t.p : mix(t.ink, 16, t.bg) }}>
        <Animated.View style={{ position: 'absolute', top: 2, left: a.interpolate({ inputRange: [0, 1], outputRange: [2, 22] }), width: 27, height: 27, borderRadius: 14, backgroundColor: '#fff', boxShadow: '0px 2px 6px rgba(0,0,0,0.2)' }} />
      </Pressable>
    );
  }
  const ks = on ? 24 : 16;
  return (
    <Pressable onPress={press} accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on }}
      style={{ width: 52, height: 32, borderRadius: 16, borderWidth: 2, borderColor: on ? t.p : t.mut, backgroundColor: on ? t.p : t.soft }}>
      <Animated.View style={{ position: 'absolute', top: on ? 2 : 6, left: a.interpolate({ inputRange: [0, 1], outputRange: [6, 22] }), width: ks, height: ks, borderRadius: 12, backgroundColor: on ? t.op : t.mut, alignItems: 'center', justifyContent: 'center' }}>
        {on && <Icon name="check" size={16} color={t.p} />}
      </Animated.View>
    </Pressable>
  );
}

/** Radio dot (Android radio lists and the report reasons). */
export function Radio({ on }: { on: boolean }) {
  const t = useTheme();
  return (
    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? t.p : t.outline, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: on ? t.p : 'transparent' }} />
    </View>
  );
}

/** Round avatar: photo if visible, otherwise initials on the aura gradient (or on surface). */
export function Avatar({ size, initials, photo, onSurface }: { size: number; initials: string; photo?: string | null; onSurface?: boolean }) {
  const t = useTheme();
  if (photo) return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: onSurface ? t.s : undefined, backgroundImage: onSurface ? undefined : t.avatarBg }}>
      <D style={{ color: t.p, fontSize: size * 0.38, lineHeight: size * 0.5 }}>{initials}</D>
    </View>
  );
}

/** Small rounded pill (status tags, score pills). */
export function Pill({ label, bg, fg, height = 28, fontSize = 13, bold = true, icon }: { label: string; bg: string; fg: string; height?: number; fontSize?: number; bold?: boolean; icon?: IconName }) {
  return (
    <View style={{ height, flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: icon ? 12 : 10, borderRadius: height / 2, backgroundColor: bg, alignSelf: 'flex-start' }}>
      {icon && <Icon name={icon} size={15} color={fg} />}
      <T style={{ color: fg, fontSize, fontWeight: bold ? '600' : '500' }}>{label}</T>
    </View>
  );
}

/** The thin progress bar used in onboarding and on the profile card. */
export function ProgressBar({ value, track, height = 6 }: { value: number; track?: string; height?: number }) {
  const t = useTheme();
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track ?? t.line, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', borderRadius: height / 2, backgroundImage: t.accentBar }} />
    </View>
  );
}
