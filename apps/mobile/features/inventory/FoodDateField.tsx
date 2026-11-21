import type { ExpiryType } from '@cena/contracts';
import { Button, FilterChip, Input, spacing, Text } from '@cena/ui';
import { StyleSheet, View } from 'react-native';

const TYPES: { value: ExpiryType; label: string }[] = [
  { value: 'BEST_BEFORE', label: 'Bäst före' },
  { value: 'USE_BY', label: 'Sista förbrukningsdag' },
];

interface FoodDateFieldProps {
  date: string;
  type: ExpiryType | null;
  disabled?: boolean;
  error?: string | null;
  onChange(date: string, type: ExpiryType | null): void;
}

export function FoodDateField({ date, type, disabled, error, onChange }: FoodDateFieldProps) {
  return (
    <View style={styles.field}>
      <Input
        label="Datum (valfritt)"
        accessibilityLabel="Datum (valfritt)"
        accessibilityHint="Ange datum som ÅÅÅÅ-MM-DD. Datumet är frivilligt."
        value={date}
        onChangeText={(value) => onChange(value, type)}
        placeholder="Välj datum · ÅÅÅÅ-MM-DD"
        editable={!disabled}
        maxLength={10}
        accessibilityState={{ disabled }}
      />
      {date.trim() ? (
        <>
          <Text variant="label">Datumtyp</Text>
          <View style={styles.options}>
            {TYPES.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={type === option.value}
                disabled={disabled}
                onPress={() => onChange(date, option.value)}
              />
            ))}
          </View>
          <Button
            label="Ta bort datum"
            variant="outline"
            disabled={disabled}
            onPress={() => onChange('', null)}
          />
        </>
      ) : null}
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
