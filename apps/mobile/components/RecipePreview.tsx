import { ArrowRight, Clock3 } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { Card, colors, spacing, Text } from '@cena/ui';
import type { RecipeSummary } from '@cena/contracts';
import { RecipeAvailability } from '../features/recipes/RecipeAvailability';

interface RecipePreviewProps {
  recipe: RecipeSummary;
  onPress?: PressableProps['onPress'];
}

export function RecipePreview({ recipe, onPress }: RecipePreviewProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Visa receptet ${recipe.title}`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card style={styles.preview}>
        <View style={styles.topLine}>
          <View style={styles.time}>
            <Clock3 size={15} color={colors.text.primary} strokeWidth={1.8} />
            <Text variant="caption" style={styles.metadata}>
              {`${recipe.totalMinutes} min totalt · ${recipe.servings} portioner`}
            </Text>
          </View>
          <ArrowRight size={18} color={colors.brand.primary} strokeWidth={1.8} />
        </View>
        <Text variant="h3" style={styles.name}>
          {recipe.title}
        </Text>
        <Text variant="bodySmall" style={styles.description}>
          {recipe.description}
        </Text>
        <View style={styles.footer}>
          <RecipeAvailability availability={recipe.availability} />
          {recipe.usesExpiringIngredients ? (
            <Text variant="caption" style={styles.expiring}>
              Använder ingredienser som snart når sitt datum
            </Text>
          ) : null}
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
  time: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metadata: { flexShrink: 1 },
  name: { color: colors.brand.primary, marginBottom: spacing.xs },
  description: { lineHeight: 21 },
  footer: { marginTop: spacing.md, gap: spacing.sm, alignItems: 'flex-start' },
  expiring: { color: colors.semantic.warning },
});
