import { useState } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, colors, Input, spacing, Text } from '@cena/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../features/auth/AuthProvider';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const { requestCode } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function continueWithEmail() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Ange en giltig e-postadress.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await requestCode(normalizedEmail);
      router.push({ pathname: '/(auth)/verify', params: { email: normalizedEmail } });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Koden kunde inte skickas.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandBlock}>
            <Text variant="display" style={styles.brand}>
              cena.
            </Text>
            <Text variant="h1" style={styles.title}>
              Välkommen till ditt kök.
            </Text>
            <Text style={styles.intro}>Mindre svinn. Mer smak. Börja med din e-postadress.</Text>
          </View>
          <View style={styles.form}>
            <Input
              label="E-postadress"
              placeholder="namn@exempel.se"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setError(null);
              }}
              error={error ?? undefined}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={() => void continueWithEmail()}
            />
            <Button
              label="Fortsätt med e-post"
              loading={loading}
              onPress={() => void continueWithEmail()}
            />
            <Text variant="caption" style={styles.privacy}>
              Vi skickar en engångskod till din e-post. Inget lösenord behövs.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background.primary },
  keyboardView: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  brandBlock: { marginBottom: spacing.xxl },
  brand: { color: colors.brand.primary, marginBottom: spacing.xl },
  title: { color: colors.brand.primary, maxWidth: 340 },
  intro: { marginTop: spacing.md, lineHeight: 24, maxWidth: 340 },
  form: { gap: spacing.md },
  privacy: { color: colors.text.muted, lineHeight: 18 },
});
