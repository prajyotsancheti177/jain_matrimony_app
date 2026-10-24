// 2n · Profile actions (iOS action sheet / Android bottom-sheet list) and 2o · Report.
import { useState } from 'react';
import { ActionSheetIOS, Pressable, View } from 'react-native';
import { api } from '../api';
import { ReportReason } from '../api/enums';
import { invalidate } from '../lib/query';
import { toast, toastError } from '../lib/stores';
import { isIOS, useTheme } from '../theme';
import { Radio, Switch } from './Controls';
import { ActionListSheet, Sheet } from './Overlays';
import { T } from './Text';

/** Report / block for one person. Call `open()` from a ⋯ button and render `element`. */
export function useSafety(person: { id: string; name: string } | null, onBlocked: () => void) {
  const t = useTheme();
  const [sheet, setSheet] = useState<'actions' | 'report' | null>(null);
  const [reason, setReason] = useState(ReportReason.labels[0]!);
  const [alsoBlock, setAlsoBlock] = useState(true);
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
      await api.report(person.id, reason, alsoBlock);
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
    setSheet('report');
  };

  const open = () => {
    if (!person) return;
    if (isIOS) {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: person.name, options: ['Report', `Block ${first}`, 'Cancel'], destructiveButtonIndex: 1, cancelButtonIndex: 2, tintColor: t.p },
        (i) => (i === 0 ? openReport() : i === 1 ? block() : undefined),
      );
    } else setSheet('actions');
  };

  const element = (
    <>
      {!isIOS && (
        <ActionListSheet open={sheet === 'actions'} onClose={() => setSheet(null)} title={person?.name ?? ''}
          rows={[{ icon: 'flag', label: 'Report', onPress: openReport }, { icon: 'block', label: `Block ${first}`, danger: true, onPress: block }]} />
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
