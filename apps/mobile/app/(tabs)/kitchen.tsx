import { router } from 'expo-router';
import { Plus, UserRound } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { colors, EmptyState, FilterChip, IconButton, ScreenHeader, spacing, Text } from '@cena/ui';
import { useState } from 'react';
import { InventoryItemRow } from '../../components/InventoryItemRow';
import { TabScreen } from '../../components/TabScreen';
import { MOCK_PRODUCTS } from '../../data/mockData';

const LOCATIONS = ['Alla', 'Kylskåp', 'Skafferi', 'Frys'] as const;
type LocationFilter = (typeof LOCATIONS)[number];

export default function KitchenScreen() {
  const [selectedLocation, setSelectedLocation] = useState<LocationFilter>('Alla');
  const products =
    selectedLocation === 'Alla'
      ? MOCK_PRODUCTS
      : MOCK_PRODUCTS.filter((product) => product.location === selectedLocation);

  return (
    <TabScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title="Mitt kök"
          eyebrow={`${MOCK_PRODUCTS.length} EXEMPELVAROR`}
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
        <Text variant="bodySmall" style={styles.mockNotice}>
          Det här är exempelvaror. Inget har sparats.
        </Text>

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
          {products.length === 0 ? (
            <EmptyState
              title="Här är tomt än så länge"
              description="Exempelvaror i den här kategorin saknas."
            />
          ) : (
            products.map((product) => <InventoryItemRow key={product.id} product={product} />)
          )}
        </View>
      </ScrollView>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  intro: { flex: 1, fontSize: 16, lineHeight: 24 },
  mockNotice: { color: colors.text.muted, marginTop: spacing.sm },
  filters: { gap: spacing.sm, paddingVertical: spacing.lg },
  productList: { borderTopWidth: 1, borderTopColor: colors.border },
});
