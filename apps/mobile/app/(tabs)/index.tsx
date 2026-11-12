import { Link, router } from 'expo-router';
import { ArrowRight, Plus, ShoppingBasket, Sparkles } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Badge, Button, colors, radius, spacing, Text } from '@cena/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { RecipePreview } from '../../components/RecipePreview';
import { TabScreen } from '../../components/TabScreen';
import { MOCK_PRODUCTS, MOCK_RECIPES } from '../../data/mockData';

export default function HomeScreen() {
  const expiringCount = MOCK_PRODUCTS.filter((product) => product.expiringSoon).length;

  return (
    <TabScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title="cena."
          eyebrow="DITT KÖK, SORTERAT"
          onProfilePress={() => router.push('/profile')}
        />
        <View style={styles.welcome}>
          <Text variant="h1" style={styles.greeting}>
            God kväll.
          </Text>
          <Text style={styles.intro}>Vad vill du laga med det du redan har hemma?</Text>
          <Button
            label="Hitta något att laga"
            onPress={() => router.push('/(tabs)/recipes')}
            style={styles.primaryAction}
          />
        </View>

        <View style={styles.kitchenSummary}>
          <View style={styles.summaryTitle}>
            <Text variant="h3" style={styles.sectionTitle}>
              Ditt kök
            </Text>
            <Link href="/(tabs)/kitchen" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Visa mitt kök"
                style={styles.arrowButton}
              >
                <ArrowRight size={20} color={colors.brand.primary} strokeWidth={1.8} />
              </Pressable>
            </Link>
          </View>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text variant="h2" style={styles.statNumber}>
                {MOCK_PRODUCTS.length}
              </Text>
              <Text variant="bodySmall">varor hemma</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text variant="h2" style={styles.statNumber}>
                {expiringCount}
              </Text>
              <Text variant="bodySmall">att använda snart</Text>
            </View>
          </View>
          <Text variant="caption" style={styles.mockNotice}>
            Exempel på hur ditt kök kan se ut.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text variant="h2" style={styles.sectionTitle}>
              Små saker, stor skillnad
            </Text>
          </View>
          <Link href="/add-product" asChild>
            <Pressable accessibilityRole="button" style={styles.actionRow}>
              <View style={styles.actionIcon}>
                <Plus size={19} color={colors.brand.primary} strokeWidth={1.8} />
              </View>
              <View style={styles.actionCopy}>
                <Text variant="label">Lägg till mat</Text>
                <Text variant="bodySmall">Håll koll på det du har hemma</Text>
              </View>
              <ArrowRight size={18} color={colors.brand.primary} />
            </Pressable>
          </Link>
          <Link href="/(tabs)/shopping" asChild>
            <Pressable accessibilityRole="button" style={styles.actionRow}>
              <View style={styles.actionIcon}>
                <ShoppingBasket size={19} color={colors.brand.primary} strokeWidth={1.8} />
              </View>
              <View style={styles.actionCopy}>
                <Text variant="label">Öppna inköpslistan</Text>
                <Text variant="bodySmall">Fyra saker väntar på affären</Text>
              </View>
              <ArrowRight size={18} color={colors.brand.primary} />
            </Pressable>
          </Link>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View>
              <Text variant="h2" style={styles.sectionTitle}>
                Till kvällens middag
              </Text>
              <Text variant="bodySmall" style={styles.sectionSub}>
                Förslag utifrån exempelvarorna i ditt kök
              </Text>
            </View>
            <Link href="/(tabs)/recipes" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Visa alla recept"
                style={styles.arrowButton}
              >
                <ArrowRight size={20} color={colors.brand.primary} strokeWidth={1.8} />
              </Pressable>
            </Link>
          </View>
          {MOCK_RECIPES.slice(0, 1).map((recipe) => (
            <RecipePreview
              key={recipe.id}
              recipe={recipe}
              onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
            />
          ))}
          <View style={styles.suggestionNote}>
            <Sparkles size={16} color={colors.semantic.success} />
            <Text variant="caption" style={styles.suggestionText}>
              Recepten är exempel, inte personliga rekommendationer.
            </Text>
          </View>
        </View>

        <View style={styles.bottomBrand}>
          <Badge label="Less waste. More taste." />
        </View>
      </ScrollView>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  welcome: { paddingTop: spacing.md, paddingBottom: spacing.xl },
  greeting: { color: colors.brand.primary, marginBottom: spacing.xs },
  intro: { maxWidth: 300, lineHeight: 24, marginBottom: spacing.lg },
  primaryAction: { alignSelf: 'flex-start', paddingHorizontal: spacing.lg },
  kitchenSummary: {
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.background.subtle,
  },
  summaryTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.brand.primary },
  arrowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.base },
  stat: { flex: 1, gap: spacing.xs },
  statNumber: { color: colors.brand.primary },
  statDivider: {
    width: 1,
    height: 42,
    backgroundColor: colors.border,
    marginHorizontal: spacing.base,
  },
  mockNotice: { color: colors.text.muted },
  section: { marginTop: spacing.xl },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionSub: { marginTop: spacing.xs, lineHeight: 20 },
  actionRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.background.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: { flex: 1, gap: spacing.xs },
  suggestionNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  suggestionText: { flex: 1, lineHeight: 18, color: colors.text.muted },
  bottomBrand: { alignItems: 'center', marginTop: spacing.xl },
});
