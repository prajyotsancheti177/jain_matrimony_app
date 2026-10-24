// 2a · Welcome & log in (option 5c, with the 6a thin folded-hands mark).
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api';
import { formatPhone } from '../api/format';
import { Button } from '../components/Controls';
import { FoldedHands, Icon, type IconName } from '../components/Icon';
import { D, T } from '../components/Text';
import { toastError, useSession } from '../lib/stores';
import { alpha, isIOS, mix, useTheme } from '../theme';

const POINTS: { i: IconName; t: string }[] = [
  { i: 'verified_user', t: 'ID-verified' },
  { i: 'lock', t: 'Photos private' },
  { i: 'family_restroom', t: 'Family alerts' },
];

export default function Welcome() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState(useSession.getState().phone);
  const [busy, setBusy] = useState(false);
  const ok = phone.replace(/\D/g, '').length === 10;

  const send = async () => {
    if (!ok) return;
    setBusy(true);
    try {
      await api.sendOtp(phone);
      useSession.getState().set({ phone });
      router.push('/otp');
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const input = (
    <TextInput
      value={phone}
      onChangeText={(v) => setPhone(formatPhone(v))}
      keyboardType="number-pad"
      textContentType="telephoneNumber"
      autoComplete="tel"
      placeholder={isIOS ? '98250 43210' : undefined}
      placeholderTextColor={t.mut}
      accessibilityLabel="WhatsApp number"
      maxLength={11}
      style={{ flex: 1, height: '100%', fontSize: isIOS ? 18 : 16, fontWeight: isIOS ? '600' : '400', letterSpacing: 0.5, color: t.ink }}
      selectionColor={t.p}
      returnKeyType="go"
      onSubmitEditing={send}
    />
  );
  const check = ok && <Icon name="check_circle" size={22} color={t.ok} fill />;

  return (
    <KeyboardAvoidingView behavior={isIOS ? 'padding' : undefined} style={{ flex: 1, backgroundImage: `linear-gradient(165deg, ${mix(t.p, 82, '#FFFFFF')}, ${mix(t.p, 80, '#000000')} 62%)` }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        {/* Jai Jinendra mark: thin outline hands over a soft gold glow */}
        <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 24, alignSelf: 'center', width: 240, height: 320, opacity: 0.9, alignItems: 'center' }}>
          <View style={{ position: 'absolute', top: 147 - 140, width: 280, height: 280, borderRadius: 140, backgroundImage: `radial-gradient(circle, ${alpha(t.a, 0.38)}, transparent 68%)` }} />
          <View style={{ width: 240, height: 300, alignItems: 'center', justifyContent: 'center' }}>
            <FoldedHands size={230} color="#FFFFFF" />
          </View>
        </View>

        <View style={{ flex: 1, minHeight: insets.top + 330, justifyContent: 'flex-end', paddingHorizontal: 26, paddingBottom: 28 }}>
          <D accessibilityRole="header" style={{ color: '#FFFFFF', fontSize: 40, lineHeight: 46, textAlign: 'center' }}>Jai Jinendra</D>
          <T style={{ color: mix('#FFFFFF', 86, t.p), fontSize: 16, marginTop: 6, textAlign: 'center' }}>Log in or create your profile.</T>
        </View>

        <View style={{ backgroundColor: t.bg, borderTopLeftRadius: isIOS ? 30 : 28, borderTopRightRadius: isIOS ? 30 : 28, paddingTop: 24, paddingHorizontal: 20, gap: 14 }}>
          {isIOS ? (
            <View>
              <T style={{ fontSize: 13, fontWeight: '600', color: t.mut, paddingLeft: 4, marginBottom: 8 }}>WhatsApp number</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: 14, backgroundColor: t.s, paddingHorizontal: 16, gap: 12 }}>
                <T style={{ fontSize: 17, fontWeight: '600' }}>+91</T>
                <View style={{ width: 1, height: 24, backgroundColor: t.line }} />
                {input}
                {check}
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: 4, borderWidth: 2, borderColor: t.p, paddingHorizontal: 14, gap: 10, marginTop: 6 }}>
              <T style={{ position: 'absolute', top: -10, left: 10, paddingHorizontal: 4, backgroundColor: t.bg, fontSize: 12, color: t.p }}>WhatsApp number</T>
              <T style={{ fontSize: 16, color: t.mut }}>+91</T>
              {input}
              {check}
            </View>
          )}
          <Button label="Continue" iconRight="arrow_forward" fontSize={16.5} onPress={send} disabled={!ok} busy={busy} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
            {POINTS.map((p) => (
              <View key={p.t} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name={p.i} size={15} color={t.mut} />
                <T style={{ fontSize: 12.5, color: t.mut }}>{p.t}</T>
              </View>
            ))}
          </View>
          <T style={{ fontSize: 11.5, textAlign: 'center', lineHeight: 17, color: t.mut, paddingBottom: 30 + insets.bottom }}>By continuing you agree to the Terms and Privacy Policy</T>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
