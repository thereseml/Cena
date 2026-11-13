import { Redirect, Stack, useSegments } from 'expo-router';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { Button, colors, spacing, Text } from '@cena/ui';
import { useAuth } from './AuthProvider';

export function AuthRouter() {
  const { status, error, hasSession, retryBootstrap, signOut } = useAuth();
  const segments = useSegments();
  const inAuth = segments[0] === '(auth)';

  if (status === 'initializing' || status === 'loadingProfile') {
    return (
      <View style={styles.center}>
        <Text variant="h1" style={styles.brand}>
          cena.
        </Text>
        <ActivityIndicator color={colors.brand.primary} />
        <Text>{status === 'initializing' ? 'Öppnar ditt kök…' : 'Hämtar ditt hushåll…'}</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.center}>
        <Text variant="h2">Vi kunde inte ansluta</Text>
        <Text style={styles.message}>{error}</Text>
        {hasSession ? (
          <>
            <Button label="Försök igen" onPress={() => void retryBootstrap()} />
            <Button
              label="Logga ut"
              variant="outline"
              onPress={() => {
                void signOut().catch(() => Alert.alert('Kunde inte logga ut', 'Försök igen.'));
              }}
            />
          </>
        ) : null}
      </View>
    );
  }

  if (status === 'authenticated' && inAuth) return <Redirect href="/(tabs)" />;
  if (status === 'signedOut' && !inAuth) return <Redirect href="/(auth)" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.primary },
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="add-product" />
      <Stack.Screen name="recipe/[id]" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background.primary,
  },
  brand: { color: colors.brand.primary },
  message: { textAlign: 'center', marginBottom: spacing.md },
});
