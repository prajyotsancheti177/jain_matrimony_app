// 2c · Enter the code.
// iOS can't read WhatsApp codes, so it offers Paste. Android fills the code from the clipboard
// as soon as the person comes back from WhatsApp with it copied.
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { AppState, Pressable, TextInput, View } from 'react-native';
import { api } from '../api';
import { Button } from '../components/Controls';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { D, T } from '../components/Text';
import { toast, toastError, useSession } from '../lib/stores';
import { isAndroid, isIOS, useTheme } from '../theme';

const DEMO_CODE = '482913';
const findCode = (s: string) => s.match(/\b(\d{6})\b/)?.[1] ?? null;

export default function Otp() {
  const t = useTheme();
  const phone = useSession((s) => s.phone);
  const [otp, setOtp] = useState('');
  const [wait, setWait] = useState(30);
  const [busy, setBusy] = useState(false);
  const input = useRef<ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const fromClipboard = useCallback(async () => {
    const code = findCode(await Clipboard.getStringAsync().catch(() => ''));
    if (code) setOtp(code);
    return code;
  }, []);

  // Android: pick the code up from the clipboard when returning to the app.
  useEffect(() => {
    if (!isAndroid) return;
    if (api.demo) {
      const id = setTimeout(() => setOtp(DEMO_CODE), 1600);
      return () => clearTimeout(id);
    }
    const sub = AppState.addEventListener('change', (s) => s === 'active' && fromClipboard());
    return () => sub.remove();
  }, [fromClipboard]);
  const auto = otp.length === 6 ? 'Code filled from WhatsApp' : api.demo ? 'Reading the code from WhatsApp…' : 'Waiting for the code…';

  const paste = async () => {
    if (!(await fromClipboard())) {
      if (api.demo) setOtp(DEMO_CODE);
      else toast('No 6-digit code on the clipboard', 'content_paste');
    }
  };

  const verify = async () => {
    if (otp.length !== 6) return;
    setBusy(true);
    try {
      const r = await api.verifyOtp(phone, otp);
      const done = !r.isNewUser && r.isProfileComplete;
      useSession.getState().set({ status: done ? 'signedIn' : 'onboarding' });
      router.dismissAll();
      router.replace(done ? '/matches' : '/onboarding/about');
    } catch (e) {
      toastError(e);
      setOtp('');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      await api.sendOtp(phone);
      setWait(30);
      toast('New code sent on WhatsApp', 'send');
    } catch (e) {
      toastError(e);
    }
  };

  return (
    <Screen aura fill header={{ back: { label: 'Back' }, clear: true }} contentStyle={{ paddingTop: 16, paddingHorizontal: 24, paddingBottom: 20 }}>
      <D accessibilityRole="header" style={{ color: t.p, fontSize: 34, lineHeight: 40, marginBottom: 10 }}>Enter the code</D>
      <T style={{ color: t.mut, fontSize: 16, lineHeight: 23, marginBottom: 28 }}>Sent to +91 {phone} on WhatsApp.</T>

      <Pressable onPress={() => input.current?.focus()} accessibilityLabel="Verification code" style={{ flexDirection: 'row', gap: 8 }}>
        {Array.from({ length: 6 }, (_, i) => {
          const active = !!otp[i] || i === otp.length;
          return (
            <View key={i} style={{ flex: 1, height: 56, borderRadius: t.fieldR, backgroundColor: t.s, alignItems: 'center', justifyContent: 'center', borderWidth: isAndroid && !active ? 1 : 2, borderColor: active ? t.p : isAndroid ? t.outline : 'transparent' }}>
              <T style={{ fontSize: 24, fontWeight: '600' }}>{otp[i] ?? ''}</T>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={input}
        value={otp}
        onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus
        maxLength={6}
        caretHidden
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
      />

      {isIOS ? (
        <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <T style={{ flex: 1, fontSize: 14, color: t.mut }}>Copied the code in WhatsApp?</T>
          <Pressable onPress={paste} style={{ height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: t.soft, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="content_paste" size={18} color={t.p} />
            <T style={{ color: t.p, fontSize: 15, fontWeight: '600' }}>Paste</T>
          </Pressable>
        </View>
      ) : (
        <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name={otp.length === 6 ? 'check_circle' : 'sync'} size={20} color={t.p} />
          <T style={{ fontSize: 14, color: t.mut }}>{auto}</T>
        </View>
      )}
      {wait > 0 ? (
        <T style={{ marginTop: 14, fontSize: 14, color: t.mut }}>Resend in 0:{String(wait).padStart(2, '0')}</T>
      ) : (
        <Pressable onPress={resend} style={{ marginTop: 14, alignSelf: 'flex-start' }}>
          <T style={{ fontSize: 14, color: t.p, fontWeight: '600' }}>Resend code</T>
        </Pressable>
      )}
      <View style={{ flex: 1, minHeight: 24 }} />
      <Button label="Verify" onPress={verify} disabled={otp.length !== 6} busy={busy} />
    </Screen>
  );
}
