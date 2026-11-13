import { router } from 'expo-router';
import { Plus, UserRound } from 'lucide-react-native';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  colors,
  EmptyState,
  FilterChip,
  IconButton,
  Input,
  ScreenHeader,
  spacing,
  Text,
} from '@cena/ui';
import { useState } from 'react';
import { InventoryItemRow } from '../../components/InventoryItemRow';
import { TabScreen } from '../../components/TabScreen';
import { useHouseholdInventory } from '../../features/inventory/useHouseholdInventory';

const LOCATIONS = ['Alla', 'Kylskåp', 'Skafferi', 'Frys'] as const;
type LocationFilter = (typeof LOCATIONS)[number];
const LOCATION_FILTERS = {
  Kylskåp: 'FRIDGE',
  Frys: 'FREEZER',
  Skafferi: 'PANTRY',
} as const;

export default function KitchenScreen() {
  const [selectedLocation, setSelectedLocation] = useState<LocationFilter>('Alla');
  const [search, setSearch] = useState('');
  const { items, loading, error, retry } = useHouseholdInventory();
  const normalizedSearch = search.trim().toLocaleLowerCase('sv-SE');
  const products = items.filter((item) => {
    const matchesLocation =
      selectedLocation === 'Alla' || item.storageLocation === LOCATION_FILTERS[selectedLocation];
    const matchesSearch = item.name.toLocaleLowerCase('sv-SE').includes(normalizedSearch);
    return matchesLocation && matchesSearch;
  });
  const eyebrow = getInventoryCountLabel(items.length, loading, error);

  return (
    <TabScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title="Mitt kök"
          eyebrow={eyebrow}
          trailing={
            <IconButton
              icon={<UserRound size={21} color={colors.brand.primary} strokeWidth={1.8} />}
              accessibilityLabel="Öppna profil och inställningar"
              onPress={() => router.push('/profile')}
            />
          }
        />
        <View style={styles.introRow}>
          <Text style={styles.intro}>En överblick över det du har hemma.</Text>
          <IconButton
            icon={<Plus size={21} color={colors.text.inverse} strokeWidth={1.9} />}
            variant="filled"
            accessibilityLabel="Lägg till mat"
            onPress={() => router.push('/add-product')}
          />
        </View>

        <Input
          label="Sök i ditt kök"
          value={search}
          onChangeText={setSearch}
          placeholder="Sök efter mat"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.search}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {LOCATIONS.map((location) => (
            <FilterChip
              key={location}
              label={location}
              selected={selectedLocation === location}
              onPress={() => setSelectedLocation(location)}
            />
          ))}
        </ScrollView>

        <View style={styles.productList}>
          {loading ? (
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Läser in ditt kök"
              style={styles.feedback}
            >
              <ActivityIndicator color={colors.brand.primary} />
              <Text variant="bodySmall">Läser in ditt kök…</Text>
            </View>
          ) : error ? (
            <View style={styles.feedback}>
              <Text variant="h3">Köket kunde inte läsas in</Text>
              <Text variant="bodySmall" style={styles.errorText}>
                {error}
              </Text>
              <Button label="Försök igen" variant="outline" onPress={retry} />
            </View>
          ) : items.length === 0 ? (
            <EmptyState
              title="Ditt kök är tomt"
              description="Lägg till din första vara så hjälper Cena dig hålla koll på vad du har hemma."
              action={<Button label="Lägg till mat" onPress={() => router.push('/add-product')} />}
            />
          ) : products.length === 0 ? (
            <EmptyState
              title={normalizedSearch ? 'Inga varor matchar sökningen' : 'Inga varor här än'}
              description={
                normalizedSearch ? 'Prova ett annat sökord.' : 'Välj en annan förvaringsplats.'
              }
            />
          ) : (
            products.map((item) => (
              <InventoryItemRow
                key={item.id}
                item={item}
                onPress={() =>
                  router.push({ pathname: '/inventory/[id]', params: { id: item.id } })
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </TabScreen>
  );
}

function getInventoryCountLabel(count: number, loading: boolean, error: string | null): string {
  if (loading) return 'LÄSER IN';
  if (error) return 'KÖKET';
  return `${count} ${count === 1 ? 'VARA' : 'VAROR'}`;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  intro: { flex: 1, fontSize: 16, lineHeight: 24 },
  search: { marginTop: spacing.base },
  filters: { gap: spacing.sm, paddingVertical: spacing.lg },
  productList: { borderTopWidth: 1, borderTopColor: colors.border },
  feedback: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  errorText: { color: colors.semantic.error, textAlign: 'center' },
});
