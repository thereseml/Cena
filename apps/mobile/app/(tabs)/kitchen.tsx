import { Link, router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Badge, colors, spacing, Text } from '@cena/ui';
import { useState } from 'react';
import { ScreenHeader } from '../../components/ScreenHeader';
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
          onProfilePress={() => router.push('/profile')}
        />
        <View style={styles.introRow}>
          <Text style={styles.intro}>En överblick över det du har hemma.</Text>
          <Link href="/add-product" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Lägg till mat"
              style={styles.addButton}
            >
              <Plus size={21} color={colors.text.inverse} strokeWidth={1.9} />
            </Pressable>
          </Link>
        </View>
        <Text variant="bodySmall" style={styles.mockNotice}>
          Det här är exempelvaror. Inget har sparats.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {LOCATIONS.map((location) => {
            const selected = selectedLocation === location;
            return (
              <Pressable
                key={location}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setSelectedLocation(location)}
                style={[styles.filter, selected && styles.selectedFilter]}
              >
                <Text variant="label" style={selected ? styles.selectedFilterText : undefined}>
                  {location}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.productList}>
          {products.length === 0 ? (
            <View style={styles.emptyState}>
              <Text variant="h3" style={styles.productName}>
                Här är tomt än så länge
              </Text>
              <Text variant="bodySmall">Exempelvaror i den här kategorin saknas.</Text>
            </View>
          ) : (
            products.map((product) => (
              <View key={product.id} style={styles.productRow}>
                <View style={styles.productCopy}>
                  <Text variant="h3" style={styles.productName}>
                    {product.name}
                  </Text>
                  <Text variant="bodySmall">
                    {product.quantity} · {product.location}
                  </Text>
                  {product.expires ? (
                    <Text
                      variant="caption"
                      style={product.expiringSoon ? styles.expiring : styles.expiry}
                    >
                      {product.expires}
                    </Text>
                  ) : null}
                </View>
                {product.expiringSoon ? <Badge label="Använd snart" /> : null}
              </View>
            ))
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
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockNotice: { color: colors.text.muted, marginTop: spacing.sm },
  filters: { gap: spacing.sm, paddingVertical: spacing.lg },
  filter: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedFilter: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  selectedFilterText: { color: colors.text.inverse },
  productList: { borderTopWidth: 1, borderTopColor: colors.border },
  productRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  productCopy: { flex: 1, gap: spacing.xs },
  productName: { color: colors.brand.primary },
  expiry: { color: colors.text.muted },
  expiring: { color: colors.semantic.warning },
  emptyState: { paddingVertical: spacing.xl, gap: spacing.sm },
});
