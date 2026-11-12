import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from './theme';
import { Text } from './Text';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text variant="h3" accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {description ? (
        <Text variant="bodySmall" style={styles.description}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  icon: { marginBottom: spacing.xs },
  title: { textAlign: 'center' },
  description: { maxWidth: 320, textAlign: 'center', lineHeight: 21 },
  action: { marginTop: spacing.xs },
});
