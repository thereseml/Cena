import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors, spacing, Text } from '@cena/ui';
import { useAuth } from '../features/auth/AuthProvider';
import { InventoryItemForm } from '../features/inventory/InventoryItemForm';
import type { SaveInventoryItemInput } from '@cena/contracts';
import { apiRequest } from '../lib/api';

export default function AddProductScreen() {
  const { profile } = useAuth();
  const householdId = profile?.households[0]?.id;

  async function addItem(input: SaveInventoryItemInput, requestKey: string): Promise<void> {
    if (!householdId) throw new Error('Ditt hushåll kunde inte hittas.');
    await apiRequest(`households/${householdId}/inventory`, {
      method: 'POST',
      body: JSON.stringify(input),
      headers: { 'Idempotency-Key': requestKey },
    });
    router.replace('/(tabs)/kitchen');
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Tillbaka"
          style={styles.backButton}
        >
          <ArrowLeft size={20} color={colors.brand.primary} strokeWidth={1.8} />
        </Pressable>
        <Text variant="h1" style={styles.title}>
          Lägg till mat
        </Text>
        <Text style={styles.intro}>Skriv in det du vill hålla koll på i ditt kök.</Text>
        {!householdId ? (
          <View style={styles.feedback}>
            <Text accessibilityRole="alert">
              Ditt hushåll kunde inte hittas. Försök logga in igen.
            </Text>
            <Button
              label="Tillbaka till mitt kök"
              variant="outline"
              onPress={() => router.back()}
            />
          </View>
        ) : (
          <InventoryItemForm saveLabel="Lägg till vara" onSave={addItem} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background.primary },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  backButton: { width: 48, height: 48, justifyContent: 'center' },
  title: { color: colors.brand.primary, marginTop: spacing.md },
  intro: { lineHeight: 24, marginTop: spacing.sm, marginBottom: spacing.xl },
  feedback: { alignItems: 'center', gap: spacing.md },
});
