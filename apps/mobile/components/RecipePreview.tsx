import { ArrowRight, Clock3 } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { Badge, Card, colors, spacing, Text } from '@cena/ui';
import type { RecipeSuggestion } from '../data/mockData';

interface RecipePreviewProps {
  recipe: RecipeSuggestion;
  onPress?: PressableProps['onPress'];
}

export function RecipePreview({ recipe, onPress }: RecipePreviewProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Visa receptet ${recipe.name}`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card style={styles.preview}>
        <View style={styles.topLine}>
          <View style={styles.time}>
            <Clock3 size={15} color={colors.text.primary} strokeWidth={1.8} />
            <Text variant="caption">{recipe.minutes} min</Text>
          </View>
          <ArrowRight size={18} color={colors.brand.primary} strokeWidth={1.8} />
        </View>
        <Text variant="h3" style={styles.name}>
          {recipe.name}
        </Text>
        <Text variant="bodySmall" style={styles.description}>
          {recipe.description}
        </Text>
        <View style={styles.footer}>
          <Badge
            label={`${recipe.availableIngredients} av ${recipe.totalIngredients} ingredienser`}
          />
          <Text variant="caption" style={styles.note}>
            {recipe.note}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  preview: {
    marginBottom: spacing.md,
  },
  pressed: { opacity: 0.76 },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  time: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { color: colors.brand.primary, marginBottom: spacing.xs },
  description: { lineHeight: 21 },
  footer: { marginTop: spacing.md, gap: spacing.sm, alignItems: 'flex-start' },
  note: { color: colors.semantic.success },
});
