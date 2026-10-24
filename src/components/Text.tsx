import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '../theme';

/** UI text: the platform's system font (SF Pro on iOS, Roboto on Android), ink colour. */
export function T({ style, ...p }: TextProps) {
  const t = useTheme();
  return <RNText {...p} style={[{ color: t.ink, fontSize: 15 }, style]} />;
}

/** Display text (names, headings, logo): the display font picked in the Theme lab. */
export function D({ style, ...p }: TextProps & { style?: TextStyle | TextStyle[] }) {
  const t = useTheme();
  // Custom fonts carry their own weight; fontWeight must stay normal or Android falls back to the system font.
  return <RNText {...p} style={[{ color: t.ink, fontFamily: t.displayFont, fontWeight: 'normal' }, style]} />;
}
