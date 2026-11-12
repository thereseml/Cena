import { useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ShoppingBasket, UserRound } from 'lucide-react-native';
import { colors, EmptyState, IconButton, ScreenHeader, spacing, Text } from '@cena/ui';
import { ShoppingListItem } from '../../components/ShoppingListItem';
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
          trailing={
            <IconButton
              icon={<UserRound size={21} color={colors.brand.primary} strokeWidth={1.8} />}
              accessibilityLabel="Öppna profil och inställningar"
              onPress={() => router.push('/profile')}
            />
          }
        />
        <Text style={styles.intro}>En liten lista gör handlingen enklare.</Text>
        <Text variant="bodySmall" style={styles.mockNotice}>
          Exempel på en inköpslista. Dina ändringar sparas inte.
        </Text>

        {MOCK_SHOPPING_ITEMS.length === 0 ? (
          <EmptyState
            icon={<ShoppingBasket size={28} color={colors.brand.primary} strokeWidth={1.7} />}
            title="Listan är tom"
            description="Saker du vill handla samlas här."
          />
        ) : (
          <View style={styles.list}>
            {MOCK_SHOPPING_ITEMS.map((item) => {
              const checked = checkedItems.includes(item);
              return (
                <ShoppingListItem
                  key={item}
                  item={item}
                  checked={checked}
                  onToggle={() => toggleItem(item)}
                />
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
  completeMessage: { marginTop: spacing.lg, color: colors.semantic.success },
});
