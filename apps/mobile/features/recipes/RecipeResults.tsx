import type { RecipePage, RecipeSummary } from '@cena/contracts';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button, colors, EmptyState, spacing, Text } from '@cena/ui';
import { RecipePreview } from '../../components/RecipePreview';

export interface RecipeResultsProps {
  data: RecipePage | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelect: (recipe: RecipeSummary) => void;
  onPage: (page: number) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function RecipeResults({
  data,
  loading,
  error,
  onRetry,
  onSelect,
  onPage,
  emptyTitle = 'Inga recept hittades',
  emptyDescription = 'Prova en annan sökning eller ändra dina filter.',
}: RecipeResultsProps) {
  if (loading)
    return <ActivityIndicator accessibilityLabel="Läser in recept" color={colors.brand.primary} />;
  if (error)
    return (
      <EmptyState
        title="Recept kunde inte läsas in"
        description={error}
        action={<Button label="Försök igen" onPress={onRetry} />}
      />
    );
  if (!data) return null;
  return (
    <View style={styles.content}>
      {data.items.length ? (
        data.items.map((recipe) => (
          <RecipePreview key={recipe.id} recipe={recipe} onPress={() => onSelect(recipe)} />
        ))
      ) : (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}
      <Text variant="caption" accessibilityLiveRegion="polite">
        {`${data.total} recept · Sida ${data.page} av ${Math.max(1, Math.ceil(data.total / data.pageSize))}`}
      </Text>
      <View style={styles.paging}>
        <Button
          label="Föregående"
          variant="outline"
          disabled={data.page <= 1}
          onPress={() => onPage(data.page - 1)}
        />
        <Button
          label="Nästa"
          variant="outline"
          disabled={data.page * data.pageSize >= data.total}
          onPress={() => onPage(data.page + 1)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  paging: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
