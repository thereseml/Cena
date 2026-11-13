import { router } from 'expo-router';
import { ArrowRight, Plus, ShoppingBasket, Sparkles, UserRound } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  ActionRow,
  Badge,
  Button,
  colors,
  IconButton,
  ScreenHeader,
  SectionHeader,
  spacing,
  StatCard,
  Text,
} from '@cena/ui';
import { RecipePreview } from '../../components/RecipePreview';
import { TabScreen } from '../../components/TabScreen';
import { MOCK_RECIPES } from '../../data/mockData';
import { useHouseholdInventory } from '../../features/inventory/useHouseholdInventory';
import { isUseSoon } from '../../features/inventory/expiry';

export default function HomeScreen() {
  const { items, loading, error, retry } = useHouseholdInventory();
  const expiringCount = items.filter((item) =>
    item.batches.some((batch) => isUseSoon(batch)),
  ).length;

  return (
    <TabScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title="cena."
          eyebrow="DITT KÖK, SORTERAT"
          trailing={
            <IconButton
              icon={<UserRound size={21} color={colors.brand.primary} strokeWidth={1.8} />}
              accessibilityLabel="Öppna profil och inställningar"
              onPress={() => router.push('/profile')}
            />
          }
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

        <StatCard
          title="Ditt kök"
          trailing={
            <IconButton
              icon={<ArrowRight size={20} color={colors.brand.primary} strokeWidth={1.8} />}
              accessibilityLabel="Visa mitt kök"
              onPress={() => router.push('/(tabs)/kitchen')}
            />
          }
          items={[
            { value: loading || error ? '—' : items.length, label: 'varor hemma' },
            { value: loading || error ? '—' : expiringCount, label: 'att använda snart' },
          ]}
          note={error ?? (loading ? 'Läser in ditt sparade kök…' : 'Från ditt sparade kök.')}
        />
        {error ? (
          <Button
            label="Försök läsa in köket igen"
            variant="outline"
            onPress={retry}
            style={styles.retry}
          />
        ) : null}

        <View style={styles.section}>
          <SectionHeader title="Små saker, stor skillnad" />
          <ActionRow
            title="Lägg till mat"
            description="Håll koll på det du har hemma"
            leadingIcon={<Plus size={19} color={colors.brand.primary} strokeWidth={1.8} />}
            trailingIcon={<ArrowRight size={18} color={colors.brand.primary} />}
            onPress={() => router.push('/add-product')}
          />
          <ActionRow
            title="Öppna inköpslistan"
            description="Fyra saker väntar på affären"
            leadingIcon={
              <ShoppingBasket size={19} color={colors.brand.primary} strokeWidth={1.8} />
            }
            trailingIcon={<ArrowRight size={18} color={colors.brand.primary} />}
            onPress={() => router.push('/(tabs)/shopping')}
          />
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Till kvällens middag"
            description="Förslag utifrån exempelvaror"
            trailing={
              <IconButton
                icon={<ArrowRight size={20} color={colors.brand.primary} strokeWidth={1.8} />}
                accessibilityLabel="Visa alla recept"
                onPress={() => router.push('/(tabs)/recipes')}
              />
            }
          />
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
  retry: { alignSelf: 'flex-start', marginTop: spacing.sm },
  section: { marginTop: spacing.xl },
  suggestionNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  suggestionText: { flex: 1, lineHeight: 18, color: colors.text.muted },
  bottomBrand: { alignItems: 'center', marginTop: spacing.xl },
});
