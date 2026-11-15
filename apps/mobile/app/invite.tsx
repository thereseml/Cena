import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { CurrentUser, HouseholdInvitationPreview } from '@cena/contracts';
import { Button, Card, colors, spacing, Text } from '@cena/ui';
import { apiErrorMessage, apiRequest } from '../lib/api';
import { useAuth } from '../features/auth/AuthProvider';

export default function InvitationScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const routeToken = Array.isArray(params.token) ? params.token[0] : params.token;
  const { invitationToken, profile, setProfileFromServer, clearInvitation } = useAuth();
  const token = routeToken ?? invitationToken;
  const [loaded, setLoaded] = useState<{
    key: string;
    preview: HouseholdInvitationPreview | null;
    error: string | null;
  } | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const requestKey = token ? `${token}:${retryCount}` : null;
  const preview =
    requestKey && loaded?.key === requestKey
      ? loaded.preview
      : token
        ? null
        : { status: 'INVALID' as const, householdName: '' };
  const error = requestKey && loaded?.key === requestKey ? loaded.error : null;
  const loading = Boolean(requestKey && loaded?.key !== requestKey);

  useEffect(() => {
    if (!token || !requestKey) return;
    const key = requestKey;
    void apiRequest<HouseholdInvitationPreview>('household-invitations/preview', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then((result) => setLoaded({ key, preview: result, error: null }))
      .catch((requestError: unknown) => {
        setLoaded({
          key,
          preview: null,
          error: apiErrorMessage(requestError, 'Inbjudan kunde inte kontrolleras. Försök igen.'),
        });
      });
  }, [token, requestKey]);

  async function accept() {
    if (!token) return;
    setAccepting(true);
    setActionError(null);
    try {
      const result = await apiRequest<{ householdId: string; profile: CurrentUser }>(
        'household-invitations/accept',
        {
          method: 'POST',
          body: JSON.stringify({ token }),
        },
      );
      setProfileFromServer(result.profile);
      await clearInvitation();
      router.replace('/(tabs)');
    } catch (requestError) {
      setActionError(apiErrorMessage(requestError, 'Du kunde inte gå med i hushållet.'));
    } finally {
      setAccepting(false);
    }
  }

  async function cancel() {
    await clearInvitation();
    router.replace(profile?.households.length ? '/(tabs)' : '/household-setup');
  }

  async function openExistingHousehold() {
    await clearInvitation();
    router.replace('/(tabs)');
  }

  const status = preview?.status;
  const invalidText =
    status === 'EXPIRED'
      ? 'Inbjudningslänken har gått ut.'
      : status === 'REVOKED'
        ? 'Inbjudan är inte längre giltig.'
        : status === 'ACCEPTED'
          ? 'Den här inbjudan har redan använts.'
          : status === 'OTHER_HOUSEHOLD'
            ? 'Du tillhör redan ett annat hushåll. Du kan inte byta hushåll automatiskt, och ditt nuvarande hushåll påverkas inte.'
            : 'Inbjudningslänken är inte giltig.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text variant="display" style={styles.brand}>
          cena.
        </Text>
        {loading ? (
          <ActivityIndicator color={colors.brand.primary} />
        ) : error && !preview ? (
          <>
            <Text variant="h2">Inbjudan kunde inte kontrolleras</Text>
            <Text>{error}</Text>
            <Button
              label="Försök igen"
              variant="outline"
              onPress={() => setRetryCount((count) => count + 1)}
            />
            <Button label="Avbryt" variant="outline" onPress={() => void cancel()} />
          </>
        ) : status === 'VALID' ? (
          <Card style={styles.card}>
            <Text variant="h1" style={styles.title}>
              Du är inbjuden!
            </Text>
            <Text style={styles.description}>Du har blivit inbjuden till ett hushåll i Cena.</Text>
            <Text variant="h3">{preview?.householdName}</Text>
            {actionError ? (
              <Text style={styles.error} accessibilityRole="alert">
                {actionError}
              </Text>
            ) : null}
            <Button label="Gå med i hushållet" loading={accepting} onPress={() => void accept()} />
            <Button
              label="Avbryt"
              variant="outline"
              disabled={accepting}
              onPress={() => void cancel()}
            />
          </Card>
        ) : status === 'ALREADY_MEMBER' ? (
          <Card style={styles.card}>
            <Text variant="h2">Du är redan med</Text>
            <Text>Du tillhör redan {preview?.householdName}.</Text>
            <Button label="Till hushållet" onPress={() => void openExistingHousehold()} />
            <Button label="Avbryt" variant="outline" onPress={() => void cancel()} />
          </Card>
        ) : preview ? (
          <Card style={styles.card}>
            <Text variant="h2">Inbjudan kan inte användas</Text>
            <Text style={styles.description}>{invalidText}</Text>
            <Button label="Avbryt" variant="outline" onPress={() => void cancel()} />
          </Card>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background.primary },
  content: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  brand: { color: colors.brand.primary, textAlign: 'center', marginBottom: spacing.lg },
  card: { gap: spacing.md },
  title: { color: colors.brand.primary },
  description: { lineHeight: 24 },
  error: { color: colors.semantic.error },
});
