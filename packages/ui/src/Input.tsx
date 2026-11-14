import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Text } from './Text';
import { colors, radius, spacing } from './theme';

export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  leadingIcon?: ReactNode;
};
export function Input({
  label,
  error,
  leadingIcon,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  editable,
  ...props
}: InputProps) {
  const accessibleLabel =
    accessibilityLabel ??
    label ??
    (typeof props.placeholder === 'string' ? props.placeholder : undefined);

  return (
    <View style={styles.container}>
      {label ? <Text variant="label">{label}</Text> : null}
      <View style={styles.inputContainer}>
        {leadingIcon ? (
          <View pointerEvents="none" accessible={false} style={styles.leadingIcon}>
            {leadingIcon}
          </View>
        ) : null}
        <TextInput
          {...props}
          accessibilityLabel={accessibleLabel}
          accessibilityHint={accessibilityHint ?? error}
          accessibilityState={{ ...accessibilityState, disabled: editable === false }}
          editable={editable}
          placeholderTextColor={colors.text.muted}
          style={[
            styles.input,
            leadingIcon ? styles.inputWithLeadingIcon : undefined,
            error ? styles.invalid : undefined,
            style,
          ]}
        />
      </View>
      {error ? (
        <Text accessibilityRole="alert" variant="caption" style={{ color: colors.semantic.error }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  inputContainer: { position: 'relative' },
  input: {
    minHeight: 48,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background.elevated,
    color: colors.text.primary,
    paddingHorizontal: spacing.base,
    fontSize: 16,
  },
  inputWithLeadingIcon: { paddingLeft: spacing.xxl + spacing.sm },
  leadingIcon: {
    position: 'absolute',
    zIndex: 1,
    left: spacing.base,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  invalid: { borderColor: colors.semantic.error },
});
