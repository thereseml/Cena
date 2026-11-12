import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Check, Circle, ShoppingBasket } from 'lucide-react-native';
import { colors, spacing, Text } from '@cena/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { TabScreen } from '../../components/TabScreen';
import { MOCK_SHOPPING_ITEMS } from '../../data/mockData';

export default function ShoppingScreen() {
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  function toggleItem(item: string) {
    setCheckedItems((current) =>
      current.includes(item) ? current.filter((checked) => checked !== item) : [...current, item],
    );
  }

  return (
    <TabScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title="Inköpslista"
          eyebrow="ATT HANDLA"
          onProfilePress={() => router.push('/profile')}
        />
        <Text style={styles.intro}>En liten lista gör handlingen enklare.</Text>
        <Text variant="bodySmall" style={styles.mockNotice}>
          Exempel på en inköpslista. Dina ändringar sparas inte.
        </Text>

        {MOCK_SHOPPING_ITEMS.length === 0 ? (
          <View style={styles.emptyState}>
            <ShoppingBasket size={28} color={colors.brand.primary} strokeWidth={1.7} />
            <Text variant="h3" style={styles.emptyTitle}>
              Listan är tom
            </Text>
            <Text variant="bodySmall">Saker du vill handla samlas här.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {MOCK_SHOPPING_ITEMS.map((item) => {
              const checked = checkedItems.includes(item);
              return (
                <Pressable
                  key={item}
                  accessibilityRole="checkbox"
                  accessibilityLabel={item}
                  accessibilityState={{ checked }}
                  onPress={() => toggleItem(item)}
                  style={styles.item}
                >
                  {checked ? (
                    <View style={styles.checked}>
                      <Check size={16} color={colors.text.inverse} strokeWidth={2.2} />
                    </View>
                  ) : (
                    <Circle size={23} color={colors.border} strokeWidth={1.7} />
                  )}
                  <Text style={[styles.itemName, checked && styles.checkedName]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {checkedItems.length === MOCK_SHOPPING_ITEMS.length && MOCK_SHOPPING_ITEMS.length > 0 ? (
          <Text variant="bodySmall" style={styles.completeMessage}>
            Allt på listan är avbockat. Snyggt jobbat.
          </Text>
        ) : null}
      </ScrollView>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  intro: { fontSize: 16, lineHeight: 24 },
  mockNotice: { color: colors.text.muted, marginTop: spacing.sm, marginBottom: spacing.lg },
  list: { borderTopWidth: 1, borderTopColor: colors.border },
  item: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemName: { flex: 1 },
  checked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary,
  },
  checkedName: { color: colors.text.muted, opacity: 0.72, textDecorationLine: 'line-through' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
  emptyTitle: { color: colors.brand.primary },
  completeMessage: { marginTop: spacing.lg, color: colors.semantic.success },
});
