import { View, StyleSheet, type ViewProps } from 'react-native';
import { colors, radius, spacing } from './theme';
export function Card({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.card, style]} />;
}
const styles = StyleSheet.create({ card: { padding: spacing.base, backgroundColor: colors.background.elevated, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card } });
