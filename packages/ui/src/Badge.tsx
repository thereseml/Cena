import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, radius, spacing } from './theme';
export function Badge({ label }: { label: string }) {
  return <View accessible accessibilityLabel={label} style={styles.badge}><Text variant="caption" style={{ color: colors.brand.primary }}>{label}</Text></View>;
}
const styles = StyleSheet.create({ badge: { alignSelf: 'flex-start', borderRadius: radius.pill, backgroundColor: colors.background.subtle, paddingVertical: spacing.xs, paddingHorizontal: spacing.md } });
