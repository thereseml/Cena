import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { colors, radius, spacing, Text } from '@cena/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { RecipePreview } from '../../components/RecipePreview';
import { TabScreen } from '../../components/TabScreen';
import { MOCK_RECIPES } from '../../data/mockData';

export default function RecipesScreen() {
  return (
    <TabScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title="Recept"
          eyebrow="INSPIRATION FÖR VARDAGEN"
          onProfilePress={() => router.push('/profile')}
        />
        <Text style={styles.intro}>
          Enkla idéer att börja med. Snart kan recepten anpassas efter det du har hemma.
        </Text>

        <View style={styles.aiPlaceholder}>
          <Text variant="h3" style={styles.placeholderTitle}>
            Recept utifrån ditt kök
          </Text>
          <Text variant="bodySmall" style={styles.placeholderCopy}>
            Personliga receptförslag är inte tillgängliga ännu. Här visas exempel medan vi bygger
            vidare.
          </Text>
        </View>

        <Text variant="h2" style={styles.sectionTitle}>
          Något gott att börja med
        </Text>
        {MOCK_RECIPES.map((recipe) => (
          <RecipePreview
            key={recipe.id}
            recipe={recipe}
            onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
          />
        ))}
      </ScrollView>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  intro: { fontSize: 16, lineHeight: 24, marginBottom: spacing.lg },
  aiPlaceholder: {
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.background.subtle,
    marginBottom: spacing.xl,
  },
  placeholderTitle: { color: colors.brand.primary, marginBottom: spacing.sm },
  placeholderCopy: { lineHeight: 21 },
  sectionTitle: { color: colors.brand.primary, marginBottom: spacing.md },
});
