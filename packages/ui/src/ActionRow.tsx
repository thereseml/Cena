import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ListItem, type ListItemProps } from './ListItem';
import { spacing } from './theme';
import { Text } from './Text';

export interface ActionRowProps extends Pick<
  ListItemProps,
  'onPress' | 'disabled' | 'accessibilityState'
> {
  title: string;
  description?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  showSeparator?: boolean;
}

export function ActionRow({
  title,
  description,
  leadingIcon,
  trailingIcon,
  showSeparator = true,
  onPress,
  disabled,
  accessibilityState,
}: ActionRowProps) {
  return (
    <ListItem
      leading={leadingIcon}
      trailing={trailingIcon}
      onPress={onPress}
      disabled={disabled}
      accessibilityState={accessibilityState}
      showSeparator={showSeparator}
      style={styles.row}
    >
      <View style={styles.copy}>
        <Text variant="label">{title}</Text>
        {description ? <Text variant="bodySmall">{description}</Text> : null}
      </View>
    </ListItem>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 72 },
  copy: { gap: spacing.xs },
});
