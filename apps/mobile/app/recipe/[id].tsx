import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Clock3 } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, colors, spacing, Text } from '@cena/ui';
import { MOCK_RECIPES } from '../../data/mockData';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = MOCK_RECIPES.find((item) => item.id === id);

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Tillbaka"
          style={styles.backButton}
        >
          <ArrowLeft size={20} color={colors.brand.primary} strokeWidth={1.8} />
        </Pressable>
        {recipe ? (
          <>
            <Text variant="caption" style={styles.eyebrow}>
              RECEPTINSPIRATION
            </Text>
            <Text variant="h1" style={styles.title}>
              {recipe.name}
            </Text>
            <Text style={styles.description}>{recipe.description}</Text>
            <View style={styles.meta}>
              <Clock3 size={17} color={colors.brand.primary} strokeWidth={1.8} />
              <Text variant="bodySmall">Cirka {recipe.minutes} minuter</Text>
              <Badge label={`${recipe.availableIngredients} av ${recipe.totalIngredients} hemma`} />
            </View>
            <View style={styles.placeholder}>
              <Text variant="h3" style={styles.placeholderTitle}>
                Receptdetaljer kommer senare
              </Text>
              <Text variant="bodySmall" style={styles.placeholderText}>
                Ingrediensmängder och tillagningssteg ingår inte i den här exempelvyn.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.placeholder}>
            <Text variant="h3" style={styles.placeholderTitle}>
              Receptet kunde inte hittas
            </Text>
            <Text variant="bodySmall" style={styles.placeholderText}>
              Välj ett av exemplen i receptlistan.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background.primary },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  backButton: { width: 48, height: 48, justifyContent: 'center' },
  eyebrow: { color: colors.semantic.success, marginTop: spacing.md, marginBottom: spacing.sm },
  title: { color: colors.brand.primary },
  description: { fontSize: 16, lineHeight: 24, marginTop: spacing.sm },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  placeholder: {
    paddingVertical: spacing.xl,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  placeholderTitle: { color: colors.brand.primary },
  placeholderText: { lineHeight: 21 },
});
