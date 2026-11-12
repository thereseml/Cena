import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { UserRound } from 'lucide-react-native';
import { Card, colors, IconButton, ScreenHeader, SectionHeader, spacing, Text } from '@cena/ui';
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
          trailing={
            <IconButton
              icon={<UserRound size={21} color={colors.brand.primary} strokeWidth={1.8} />}
              accessibilityLabel="Öppna profil och inställningar"
              onPress={() => router.push('/profile')}
            />
          }
        />
        <Text style={styles.intro}>
          Enkla idéer att börja med. Snart kan recepten anpassas efter det du har hemma.
        </Text>

        <Card style={styles.aiPlaceholder}>
          <Text variant="h3" style={styles.placeholderTitle}>
            Recept utifrån ditt kök
          </Text>
          <Text variant="bodySmall" style={styles.placeholderCopy}>
            Personliga receptförslag är inte tillgängliga ännu. Här visas exempel medan vi bygger
            vidare.
          </Text>
        </Card>

        <SectionHeader title="Något gott att börja med" />
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
    backgroundColor: colors.background.subtle,
    borderColor: 'transparent',
    marginBottom: spacing.xl,
  },
  placeholderTitle: { color: colors.brand.primary, marginBottom: spacing.sm },
  placeholderCopy: { lineHeight: 21 },
});
