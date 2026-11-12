import { Text as NativeText, type TextProps as NativeTextProps } from 'react-native';
import { colors, typography } from './theme';

export type CenaTextVariant = keyof typeof typography;
export type CenaTextProps = NativeTextProps & { variant?: CenaTextVariant; tone?: 'primary' | 'muted' | 'inverse' };

export function Text({ variant = 'body', tone = 'primary', style, ...props }: CenaTextProps) {
  return <NativeText allowFontScaling {...props} style={[typography[variant], { color: tone === 'inverse' ? colors.text.inverse : tone === 'muted' ? colors.text.muted : colors.text.primary }, style]} />;
}
