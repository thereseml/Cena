import { useState } from 'react';
import { router } from 'expo-router';
import type { CurrentUser } from '@cena/contracts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, Card, colors, Input, spacing, Text } from '@cena/ui';
import { apiRequest, apiErrorMessage } from '../lib/api';
import { useAuth } from '../features/auth/AuthProvider';

export default function HouseholdSetupScreen() {
  const { setProfileFromServer, clearInvitation, signOut } = useAuth();
  const [name, setName] = useState('Mitt hushåll');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createHousehold() {
    setLoading(true);
    setError(null);
    try {
      const profile = await apiRequest<CurrentUser>('households', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      await clearInvitation();
      setProfileFromServer(profile);
      router.replace('/(tabs)');
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Hushållet kunde inte skapas. Försök igen.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text variant="h1" style={styles.title}>
          Välkommen till Cena
        </Text>
        <Text style={styles.intro}>
          Skapa ett hushåll för att börja samla kökets varor och inköpslista.
        </Text>
        <Card style={styles.card}>
          <Input
            label="Hushållets namn"
            value={name}
            onChangeText={(value) => {
              setName(value);
              setError(null);
            }}
            maxLength={80}
          />
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <Button label="Skapa hushåll" loading={loading} onPress={() => void createHousehold()} />
        </Card>
        <Text variant="bodySmall" style={styles.note}>
          Har du fått en inbjudan? Öppna länken från den som bjudit in dig.
        </Text>
        <Button
          label="Logga ut"
          variant="outline"
          onPress={() => {
            void signOut().catch(() => Alert.alert('Kunde inte logga ut', 'Försök igen.'));
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background.primary },
  content: { flex: 1, justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  title: { color: colors.brand.primary },
  intro: { lineHeight: 24, marginBottom: spacing.md },
  card: { gap: spacing.md },
  error: { color: colors.semantic.error },
  note: { lineHeight: 20, textAlign: 'center', marginVertical: spacing.md },
});
