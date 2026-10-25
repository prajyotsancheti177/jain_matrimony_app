// Keyboard space on Android.
// The app draws edge to edge, so Android no longer shrinks the window when the keyboard opens:
// screens have to make room themselves. React Native's KeyboardAvoidingView only reacts to
// "keyboard opened" events, which never fire when a screen appears with the keyboard already up
// (for example the code screen right after the phone-number screen). This hook also reads the
// keyboard's current state on mount.
import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform, type KeyboardMetrics } from 'react-native';

/** How far the keyboard reaches up from the bottom of the screen. Its reported height leaves out
 *  the system navigation area under it, so measure from where the keyboard starts instead. */
const overlap = (m?: KeyboardMetrics | null) => (m ? Math.max(0, Dimensions.get('screen').height - m.screenY) : 0);
const current = () => (Keyboard.isVisible() ? overlap(Keyboard.metrics()) : 0);

/** Height of the open on-screen keyboard on Android, 0 when closed. Always 0 on iOS and web. */
export function useAndroidKeyboardHeight() {
  const android = Platform.OS === 'android';
  const [height, setHeight] = useState(() => (android ? current() : 0));
  useEffect(() => {
    if (!android) return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setHeight(overlap(e.endCoordinates)));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [android]);
  return height;
}
