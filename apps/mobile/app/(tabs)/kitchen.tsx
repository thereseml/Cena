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
import { getExpiryStatus } from '../../features/inventory/expiry';

const LOCATIONS = ['Alla', 'Kylskåp', 'Skafferi', 'Frys'] as const;
type LocationFilter = (typeof LOCATIONS)[number];
const DATE_FILTERS = ['Alla varor', 'Snart datum', 'Datum passerat', 'Utan datum'] as const;
type DateFilter = (typeof DATE_FILTERS)[number];
const SORT_OPTIONS = ['Standard', 'Tidigaste datum', 'Senaste datum'] as const;
type SortOption = (typeof SORT_OPTIONS)[number];
const LOCATION_FILTERS = {
  Kylskåp: 'FRIDGE',
  Frys: 'FREEZER',
  Skafferi: 'PANTRY',
} as const;

export default function KitchenScreen() {
  const [selectedLocation, setSelectedLocation] = useState<LocationFilter>('Alla');
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<DateFilter>('Alla varor');
  const [sort, setSort] = useState<SortOption>('Standard');
  const { items, loading, error, retry } = useHouseholdInventory();
  const normalizedSearch = search.trim().toLocaleLowerCase('sv-SE');
  const products = items.filter((item) => {
    const matchesLocation =
      selectedLocation === 'Alla' || item.storageLocation === LOCATION_FILTERS[selectedLocation];
    const matchesSearch = item.name.toLocaleLowerCase('sv-SE').includes(normalizedSearch);
    const statuses = item.batches.map((batch) => getExpiryStatus(batch.expiryDate));
    const matchesDate =
      selectedDate === 'Alla varor' ||
      (selectedDate === 'Snart datum' && statuses.some((status) => status === 'DATE_REACHED' || status === 'EXPIRING_SOON')) ||
      (selectedDate === 'Datum passerat' && statuses.includes('DATE_PASSED')) ||
      (selectedDate === 'Utan datum' && statuses.every((status) => status === 'NO_DATE'));
    return matchesLocation && matchesSearch && matchesDate;
  }).sort((left, right) => {
    if (sort === 'Standard') return 0;
    const dateForSort = (item: (typeof items)[number]) => {
      const dates = item.batches
        .map((batch) => batch.expiryDate)
        .filter((date): date is string => date !== null)
        .sort();
      return sort === 'Tidigaste datum' ? dates[0] ?? null : dates.at(-1) ?? null;
    };
    const leftDate = dateForSort(left);
    const rightDate = dateForSort(right);
    if (leftDate === null) return rightDate === null ? 0 : 1;
    if (rightDate === null) return -1;
    return sort === 'Tidigaste datum'
      ? leftDate.localeCompare(rightDate)
      : rightDate.localeCompare(leftDate);
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
            label="Skanna kvitto"
            variant="secondary"
            leadingIcon={<Camera size={18} color={colors.brand.primary} strokeWidth={1.8} />}
            onPress={() => router.push('/receipt-import')}
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {DATE_FILTERS.map((filter) => (
            <FilterChip
              key={filter}
              label={filter}
              selected={selectedDate === filter}
              onPress={() => setSelectedDate(filter)}
              style={styles.filterChip}
            />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {SORT_OPTIONS.map((option) => (
            <FilterChip
              key={option}
              label={`Sortera: ${option}`}
              selected={sort === option}
              onPress={() => setSort(option)}
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
              title={normalizedSearch ? 'Inga varor matchar sökningen' : 'Inga varor matchar filtret'}
              description={
                normalizedSearch
                  ? 'Prova ett annat sökord eller ändra dina filter.'
                  : 'Ändra datumfilter eller förvaringsplats.'
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
