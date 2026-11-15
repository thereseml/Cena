import { useEffect, useState } from 'react';
import { MEAL_CATEGORIES, type MealCategory } from '@cena/contracts';
import { router } from 'expo-router';
import { UserRound } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { colors, FilterChip, IconButton, Input, ScreenHeader, spacing, Text } from '@cena/ui';
import { RecipeResults } from './RecipeResults';
import { useRecipes } from './useRecipes';
import { MEAL_LABELS } from './recipe-labels';

export function RecipeBrowser({ householdId }: { householdId: string | undefined }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [mealCategory, setMealCategory] = useState<MealCategory>();
  const [maxTotalMinutes, setMaxTotalMinutes] = useState<number>();
  const [recommendations, setRecommendations] = useState(false);
  const [page, setPage] = useState(1);
  const searchPending = search.trim() !== debouncedSearch;

  useEffect(() => {
    if (!searchPending) return;
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search, searchPending]);

  const result = useRecipes(
    { householdId, search: debouncedSearch, mealCategory, maxTotalMinutes, page, pageSize: 12 },
    recommendations,
    !searchPending,
  );
  const hasActiveFilters = Boolean(search.trim() || mealCategory || maxTotalMinutes);
  const emptyState = hasActiveFilters
    ? {
        emptyTitle: 'Inga recept hittades',
        emptyDescription: 'Prova en annan sökning eller ändra dina filter.',
      }
    : {
        emptyTitle: 'Receptbiblioteket väntar på granskning',
        emptyDescription:
          'Recept visas här när de har granskats och publicerats. Inga recept publiceras automatiskt.',
      };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <ScreenHeader
        title="Vad ska vi laga idag?"
        trailing={
          <IconButton
            icon={<UserRound size={21} color={colors.brand.primary} strokeWidth={1.8} />}
            accessibilityLabel="Öppna profil och inställningar"
            onPress={() => router.push('/profile')}
          />
        }
      />
      <Text>Upptäck recept utifrån det du har hemma.</Text>
      <View style={styles.row}>
        <FilterChip
          label="Alla recept"
          selected={!recommendations}
          onPress={() => {
            setRecommendations(false);
            setPage(1);
          }}
        />
        <FilterChip
          label="Utifrån ditt kök"
          selected={recommendations}
          onPress={() => {
            setRecommendations(true);
            setPage(1);
          }}
        />
      </View>
      <Input
        accessibilityLabel="Sök recept"
        placeholder="Sök receptnamn"
        value={search}
        onChangeText={(value) => {
          setSearch(value);
          setPage(1);
        }}
        returnKeyType="search"
      />
      <Text variant="label">Måltid</Text>
      <View style={styles.row}>
        <FilterChip
          label="Alla måltider"
          selected={!mealCategory}
          onPress={() => {
            setMealCategory(undefined);
            setPage(1);
          }}
        />
        {MEAL_CATEGORIES.map((category) => (
          <FilterChip
            key={category}
            label={MEAL_LABELS[category]}
            selected={mealCategory === category}
            onPress={() => {
              setMealCategory(category);
              setPage(1);
            }}
          />
        ))}
      </View>
      <Text variant="label">Total tid, inklusive förberedelse</Text>
      <View style={styles.row}>
        {[undefined, 15, 30, 60].map((minutes) => (
          <FilterChip
            key={minutes ?? 'all'}
            label={minutes ? `Högst ${minutes} min` : 'Alla tider'}
            selected={minutes === maxTotalMinutes}
            onPress={() => {
              setMaxTotalMinutes(minutes);
              setPage(1);
            }}
          />
        ))}
      </View>
      {recommendations ? (
        <Text variant="bodySmall">
          Förslag rangordnade efter ingredienser i ditt sparade kök. Kontrollera mängder och okänd
          tillgång i receptet.
        </Text>
      ) : null}
      <RecipeResults
        {...result}
        {...emptyState}
        onRetry={result.retry}
        onPage={setPage}
        onSelect={(recipe) => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.base,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
