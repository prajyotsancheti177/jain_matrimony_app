// 2n · Profile actions (iOS action sheet / Android bottom-sheet list) and 2o · Report.
import { useState } from 'react';
import { ActionSheetIOS, Pressable, TextInput, View } from 'react-native';
import { api } from '../api';
import { ReportReason } from '../api/enums';
import { invalidate } from '../lib/query';
import { toast, toastError } from '../lib/stores';
import { isIOS, useTheme } from '../theme';
import { Radio, Switch } from './Controls';
import { ActionListSheet, Sheet } from './Overlays';
import { T } from './Text';

/** Report / block for one person. Call `open()` from a ⋯ button and render `element`. */
export function useSafety(person: { id: string; name: string } | null, onBlocked: () => void, viewProfile?: () => void) {
  const t = useTheme();
  const [sheet, setSheet] = useState<'actions' | 'report' | null>(null);
  const [reason, setReason] = useState(ReportReason.labels[0]!);
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const first = person?.name.split(' ')[0] ?? '';

  const block = async () => {
    if (!person) return;
    setSheet(null);
    try {
      await api.block(person.id);
      invalidate('matches', 'chats', 'interests');
      toast(`${person.name} is blocked`, 'block');
      onBlocked();
    } catch (e) {
      toastError(e);
    }
  };

  const report = async () => {
    if (!person) return;
    setBusy(true);
    try {
      await api.report(person.id, reason, alsoBlock, details);
      setSheet(null);
      toast('Report sent. Thank you.', 'flag');
      if (alsoBlock) {
        invalidate('matches', 'chats', 'interests');
        onBlocked();
      }
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const openReport = () => {
    setReason(ReportReason.labels[0]!);
    setAlsoBlock(true);
    setDetails('');
    setSheet('report');
  };

  const open = () => {
    if (!person) return;
    if (isIOS) {
      const opts = [...(viewProfile ? ['View profile'] : []), 'Report', `Block ${first}`, 'Cancel'];
      const o = viewProfile ? 1 : 0;
      ActionSheetIOS.showActionSheetWithOptions(
        { title: person.name, options: opts, destructiveButtonIndex: o + 1, cancelButtonIndex: o + 2, tintColor: t.p },
        (i) => (viewProfile && i === 0 ? viewProfile() : i === o ? openReport() : i === o + 1 ? block() : undefined),
      );
    } else setSheet('actions');
  };

  const element = (
    <>
      {!isIOS && (
        <ActionListSheet open={sheet === 'actions'} onClose={() => setSheet(null)} title={person?.name ?? ''}
          rows={[
            ...(viewProfile ? [{ icon: 'person' as const, label: 'View profile', onPress: () => { setSheet(null); viewProfile(); } }] : []),
            { icon: 'flag', label: 'Report', onPress: openReport },
            { icon: 'block', label: `Block ${first}`, danger: true, onPress: block },
          ]} />
      )}
      <Sheet open={sheet === 'report'} onClose={() => setSheet(null)} title={`Report ${first}`} cta="Submit" ctaLong="Submit report" onSubmit={report} busy={busy}>
        <View style={{ paddingTop: 8, paddingHorizontal: 20, paddingBottom: 4 }}>
          <T style={{ fontSize: 14, color: t.mut, marginBottom: 8 }}>{`${first} won't know it was you.`}</T>
          {ReportReason.labels.map((r) => (
            <Pressable key={r} onPress={() => setReason(r)} accessibilityRole="radio" accessibilityState={{ checked: reason === r }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, borderBottomWidth: 1, borderColor: t.line }}>
              <Radio on={reason === r} />
              <T style={{ fontSize: 15.5 }}>{r}</T>
            </Pressable>
          ))}
          <TextInput value={details} onChangeText={setDetails} multiline maxLength={1000} textAlignVertical="top"
            placeholder="What happened? (optional)" placeholderTextColor={t.mut} accessibilityLabel="Details for the review team" selectionColor={t.p}
            style={[{ minHeight: 84, marginTop: 14, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontSize: 15, lineHeight: 21, color: t.ink, outlineStyle: 'none' } as object,
              isIOS ? { borderRadius: 12, backgroundColor: t.s } : { borderRadius: 4, borderWidth: 1, borderColor: t.outline }]} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 14, paddingBottom: 4 }}>
            <T style={{ flex: 1, fontSize: 15.5 }}>Also block {first}</T>
            <Switch on={alsoBlock} onChange={setAlsoBlock} label={`Also block ${first}`} />
          </View>
        </View>
      </Sheet>
    </>
  );

  return { open, element };
}
