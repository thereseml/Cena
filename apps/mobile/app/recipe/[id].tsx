import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, IconButton, spacing } from '@cena/ui';
import { useAuth } from '../../features/auth/AuthProvider';
import { RecipeDetails } from '../../features/recipes/RecipeDetails';
import { useRecipeDetail } from '../../features/recipes/useRecipes';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const result = useRecipeDetail(
    profile?.households[0]?.id,
    typeof id === 'string' ? id : undefined,
  );
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <IconButton
          accessibilityLabel="Tillbaka"
          icon={<ArrowLeft color={colors.brand.primary} size={20} />}
          onPress={() => router.back()}
        />
        <RecipeDetails {...result} onRetry={result.retry} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background.primary },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.base },
});
