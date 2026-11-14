import { router } from 'expo-router';
import { Camera, Plus, Search, UserRound } from 'lucide-react-native';
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title="Mitt kök"
          eyebrow={eyebrow}
          style={styles.screenHeader}
          trailing={
            <IconButton
              icon={<UserRound size={21} color={colors.brand.primary} strokeWidth={1.8} />}
              accessibilityLabel="Öppna profil och inställningar"
              onPress={() => router.push('/profile')}
            />
          }
        />
        <View style={styles.actions}>
          <Button
            label="Lägg till vara"
            leadingIcon={<Plus size={18} color={colors.text.inverse} strokeWidth={1.9} />}
            onPress={() => router.push('/add-product')}
            style={styles.actionButton}
          />
          <Button
            label="Med foto"
            variant="secondary"
            leadingIcon={<Camera size={18} color={colors.brand.primary} strokeWidth={1.8} />}
            onPress={() => router.push('/photo-recognition')}
            style={styles.actionButton}
          />
        </View>

        <View style={styles.searchArea}>
          <Input
            accessibilityLabel="Sök i ditt kök"
            value={search}
            onChangeText={setSearch}
            placeholder="Sök efter mat..."
            leadingIcon={<Search size={18} color={colors.text.muted} strokeWidth={1.8} />}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

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
              style={styles.filterChip}
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
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xxl },
  screenHeader: { marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionButton: { flex: 1, minWidth: 0, paddingHorizontal: spacing.sm },
  searchArea: { marginTop: spacing.sm },
  filters: { gap: spacing.sm, paddingVertical: spacing.md },
  filterChip: { paddingHorizontal: spacing.md },
  productList: { gap: 0 },
  feedback: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  errorText: { color: colors.semantic.error, textAlign: 'center' },
});
