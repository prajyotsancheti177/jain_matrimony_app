// 2r · Get verified. iOS: checkmark list. Android: radio list.
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { api, type LocalFile } from '../api';
import { KYC_DOC_ICON, KycDoc } from '../api/enums';
import { Button, Radio } from '../components/Controls';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { D, T } from '../components/Text';
import { invalidate, setQueryData, useQuery } from '../lib/query';
import { toast, toastError } from '../lib/stores';
import { isIOS, useTheme } from '../theme';

export default function Kyc() {
  const t = useTheme();
  const q = useQuery('kyc', () => api.kyc());
  const [doc, setDoc] = useState(KycDoc.labels[0]!);
  const [file, setFile] = useState<(LocalFile & { size?: number }) | null>(null);
  const [busy, setBusy] = useState(false);
  const status = q.data?.status;
  const inReview = status === 'Pending' || status === 'Approved';

  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], copyToCacheDirectory: true });
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    setFile({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'image/jpeg', size: a.size });
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try {
      await api.submitKyc(doc, file);
      setQueryData('kyc', () => ({ status: 'Pending' as const, doc }));
      invalidate('me');
      toast('Submitted', 'task');
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const docName = q.data?.doc || doc;
  const steps = [
    { t: 'Submitted', d: 'Just now', done: true },
    { t: 'Reviewed', d: 'Within 24 hours', done: status === 'Approved' },
    { t: 'Badge added', d: 'Next to your name', done: status === 'Approved' },
  ];

  return (
    <Screen header={{ title: 'Get verified', back: { label: 'Profile' } }} fill contentStyle={{ paddingTop: 8, paddingHorizontal: 20, paddingBottom: 20 }}>
      {!q.data ? (
        q.error ? <T style={{ color: t.mut, marginTop: 32, textAlign: 'center' }}>{q.error.message}</T> : <ActivityIndicator color={t.p} style={{ marginTop: 48 }} />
      ) : inReview ? (
        <View style={{ paddingTop: 8 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundImage: t.avatarBg, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
            <Icon name={status === 'Approved' ? 'verified' : 'hourglass_top'} size={34} color={t.p} fill={status === 'Approved'} />
          </View>
          <D accessibilityRole="header" style={{ color: t.p, fontSize: 28, lineHeight: 33, marginBottom: 8 }}>{status === 'Approved' ? "You're verified" : 'In review'}</D>
          <T style={{ fontSize: 15.5, lineHeight: 23, color: t.mut, marginBottom: 24 }}>
            {status === 'Approved' ? 'The badge now shows next to your name.' : `We got your ${docName}. Usually done within 24 hours.`}
          </T>
          {steps.map((s, i) => {
            const next = !s.done && (i === 0 || steps[i - 1]!.done);
            return (
              <View key={s.t} style={{ flexDirection: 'row', gap: 14 }}>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: s.done || next ? t.p : t.outline, backgroundColor: s.done ? t.p : t.s, alignItems: 'center', justifyContent: 'center' }}>
                    {s.done && <Icon name="check" size={15} color={t.op} />}
                  </View>
                  {i < steps.length - 1 && <View style={{ width: 2, flex: 1, minHeight: 26, backgroundColor: t.line }} />}
                </View>
                <View style={{ paddingBottom: 18 }}>
                  <T style={{ fontSize: 15.5, fontWeight: '600' }}>{s.t}</T>
                  <T style={{ fontSize: 13.5, color: t.mut, marginTop: 2 }}>{s.d}</T>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View>
          <T style={{ fontSize: 15.5, lineHeight: 23, color: t.mut, marginBottom: 20 }}>
            {status === 'Rejected'
              ? `We couldn't verify your last document${q.data.reason ? `: ${q.data.reason.replace(/\.$/, '')}.` : '.'} Please try again with a clear photo.`
              : 'Verified profiles get a badge and show up higher in matches.'}
          </T>
          <View style={{ backgroundColor: t.grpBg, borderRadius: t.grpR, paddingHorizontal: t.grpPx, marginBottom: 20 }}>
            {KycDoc.labels.map((o, i) => (
              <Pressable key={o} onPress={() => setDoc(o)} accessibilityRole="radio" accessibilityState={{ checked: doc === o }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, height: 54, borderTopWidth: i ? (isIOS ? 0.5 : 0) : 0, borderColor: t.line }}>
                <Icon name={KYC_DOC_ICON[o] as 'badge'} size={22} color={t.p} />
                <T style={{ flex: 1, fontSize: 16 }}>{o}</T>
                {isIOS ? doc === o && <Icon name="check" size={22} color={t.p} /> : <Radio on={doc === o} />}
              </Pressable>
            ))}
          </View>
          <Pressable onPress={pick} accessibilityRole="button"
            style={{ paddingVertical: 24, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: file ? t.p : t.outline, backgroundColor: file ? t.soft : 'transparent', alignItems: 'center', gap: 6 }}>
            <Icon name={file ? 'task' : 'upload_file'} size={30} color={t.p} />
            <T style={{ fontSize: 15.5, fontWeight: '600' }} numberOfLines={1}>{file ? file.name : 'Upload a photo or PDF'}</T>
            <T style={{ fontSize: 13, color: t.mut }}>{file ? `${file.size ? `${(file.size / 1048576).toFixed(1)} MB · ` : ''}Tap to replace` : 'JPG, PNG, WEBP or PDF'}</T>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <Icon name="shield_lock" size={16} color={t.mut} />
            <T style={{ flex: 1, fontSize: 13, lineHeight: 19, color: t.mut }}>Only our review team sees this document.</T>
          </View>
        </View>
      )}
      <View style={{ flex: 1, minHeight: 20 }} />
      {q.data && (inReview ? (
        <Button label="Done" kind="soft" onPress={() => router.back()} />
      ) : (
        <Button label="Submit" onPress={submit} disabled={!file} busy={busy} />
      ))}
    </Screen>
  );
}
