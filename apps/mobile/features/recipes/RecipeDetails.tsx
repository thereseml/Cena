import type { IngredientAvailability, RecipeDetail } from '@cena/contracts';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Badge, Button, Card, colors, EmptyState, spacing, Text } from '@cena/ui';
import { RecipeAvailability } from './RecipeAvailability';
import { MEAL_LABELS } from './recipe-labels';

export interface RecipeDetailsProps {
  data: RecipeDetail | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onAddMissing: () => void;
}

const AVAILABILITY_LABELS: Record<IngredientAvailability, string> = {
  AVAILABLE: 'Finns hemma',
  PARTIAL: 'Finns delvis',
  MISSING: 'Saknas',
  UNKNOWN: 'Okänd tillgång',
};

export function RecipeDetails({
  data: recipe,
  loading,
  error,
  onRetry,
  onAddMissing,
}: RecipeDetailsProps) {
  if (loading)
    return (
      <ActivityIndicator
        accessibilityLabel="Läser in receptdetaljer"
        color={colors.brand.primary}
      />
    );
  if (error)
    return (
      <EmptyState
        title="Receptet kunde inte läsas in"
        description={error}
        action={<Button label="Försök igen" onPress={onRetry} />}
      />
    );
  if (!recipe)
    return (
      <EmptyState
        title="Receptet kunde inte hittas"
        description="Välj ett recept i receptlistan."
      />
    );
  return (
    <View style={styles.content}>
      <Text variant="h1" accessibilityRole="header" style={styles.title}>
        {recipe.title}
      </Text>
      <Text>{recipe.description}</Text>
      <Text variant="label">{MEAL_LABELS[recipe.mealCategory]}</Text>
      <Text>{`${recipe.totalMinutes} min totalt · ${recipe.servings} portioner`}</Text>
      <Text variant="bodySmall">{`Förberedelse ${recipe.preparationMinutes} min · Tillagning ${recipe.cookingMinutes} min`}</Text>
      <View style={styles.tags}>
        {recipe.tags.map((tag) => (
          <Badge key={tag} label={tag} />
        ))}
      </View>
      <Text variant="h2" accessibilityRole="header">
        Ingredienser
      </Text>
      <RecipeAvailability availability={recipe.availability} />
      {recipe.availability &&
      recipe.availability.missing + recipe.availability.partial + recipe.availability.unknown >
        0 ? (
        <Button label="Lägg till saknade ingredienser" variant="secondary" onPress={onAddMissing} />
      ) : null}
      <Text variant="bodySmall">
        Saknade mängder och okänd tillgång visas nedan. Kontrollera vad du har hemma innan du
        börjar.
      </Text>
      {[...recipe.ingredients]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((ingredient) => (
          <Card key={ingredient.id} style={styles.ingredient}>
            <Text variant="h3">{ingredient.displayName}</Text>
            <Text>
              {ingredient.quantity === null
                ? 'Mängd ej angiven'
                : `${ingredient.quantity.toLocaleString('sv-SE')} ${ingredient.unit}`}
            </Text>
            {ingredient.preparationNotes ? (
              <Text variant="bodySmall">{ingredient.preparationNotes}</Text>
            ) : null}
            <Text variant="label">{AVAILABILITY_LABELS[ingredient.availability ?? 'UNKNOWN']}</Text>
            {ingredient.availableQuantity !== null ? (
              <Text variant="bodySmall">{`Tillgängligt: ${ingredient.availableQuantity.toLocaleString('sv-SE')} ${ingredient.unit}`}</Text>
            ) : null}
            {ingredient.missingQuantity !== null && ingredient.missingQuantity > 0 ? (
              <Text variant="bodySmall">{`Saknas: ${ingredient.missingQuantity.toLocaleString('sv-SE')} ${ingredient.unit}`}</Text>
            ) : null}
            {ingredient.reason === 'INCOMPATIBLE_UNIT' ? (
              <Text variant="bodySmall">Enheterna kan inte jämföras.</Text>
            ) : null}
            {ingredient.reason === 'UNQUANTIFIED' ? (
              <Text variant="bodySmall">Mängden kan inte jämföras.</Text>
            ) : null}
            {ingredient.reason === 'EXPIRED' ? (
              <Text variant="bodySmall">Passerat datum räknas inte som tillgängligt.</Text>
            ) : null}
          </Card>
        ))}
      <Text variant="h2" accessibilityRole="header">
        Gör så här
      </Text>
      {recipe.instructions.map((instruction, index) => (
        <Text key={index}>{`${index + 1}. ${instruction}`}</Text>
      ))}
      <Card>
        <Text variant="bodySmall">
          Recept och matchningar är förslag. Kontrollera ingredienser, förpackningar och allergener
          själv. Receptet är inte verifierat som allergisäkert. Att läsa receptet ändrar inte ditt
          kök.
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.base },
  title: { color: colors.brand.primary },
  ingredient: { gap: spacing.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
