import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Text } from './Text';
import { colors, radius, spacing } from './theme';

export type InputProps = TextInputProps & { label: string; error?: string };
export function Input({ label, error, style, accessibilityLabel, accessibilityHint, accessibilityState, editable, ...props }: InputProps) {
  return (
    <View style={styles.container}>
      <Text variant="label">{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint ?? error}
        accessibilityState={{ ...accessibilityState, disabled: editable === false }}
        editable={editable}
        placeholderTextColor={colors.text.muted}
        style={[styles.input, error ? styles.invalid : undefined, style]}
      />
      {error ? <Text accessibilityRole="alert" variant="caption" style={{ color: colors.semantic.error }}>{error}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  input: { minHeight: 48, borderRadius: radius.input, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background.elevated, color: colors.text.primary, paddingHorizontal: spacing.base, fontSize: 16 },
  invalid: { borderColor: colors.semantic.error },
});
