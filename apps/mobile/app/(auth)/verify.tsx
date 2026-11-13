import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, colors, Input, spacing, Text } from '@cena/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../features/auth/AuthProvider';

const RESEND_DELAY_SECONDS = 60;
const OTP_CODE_LENGTH = 6;

export default function VerifyEmailScreen() {
  const { email: emailParam } = useLocalSearchParams<{ email: string }>();
  const email = Array.isArray(emailParam) ? emailParam[0] : emailParam;
  const { verifyCode, resendCode } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_DELAY_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  async function confirmCode() {
    if (!email || code.length !== OTP_CODE_LENGTH) {
      setError('Ange den sexsiffriga koden i mejlet.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await verifyCode(email, code);
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : 'Koden kunde inte verifieras.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function sendAgain() {
    if (!email || secondsLeft > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      await resendCode(email);
      setSecondsLeft(RESEND_DELAY_SECONDS);
    } catch (resendError) {
      setError(
        resendError instanceof Error ? resendError.message : 'En ny kod kunde inte skickas.',
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text variant="display" style={styles.brand}>
            cena.
          </Text>
          <Text variant="h1" style={styles.title}>
            Kolla din e-post.
          </Text>
          <Text style={styles.intro}>
            Vi har skickat en engångskod till {email || 'din e-postadress'}.
          </Text>
          <View style={styles.form}>
            <Input
              label="Verifieringskod"
              placeholder="123456"
              value={code}
              onChangeText={(value) => {
                setCode(value.replace(/\D/g, '').slice(0, OTP_CODE_LENGTH));
                setError(null);
              }}
              error={error ?? undefined}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={OTP_CODE_LENGTH}
              accessibilityHint="Skriv in engångskoden från mejlet"
            />
            <Button label="Verifiera kod" loading={loading} onPress={() => void confirmCode()} />
            <Pressable
              onPress={() => void sendAgain()}
              disabled={secondsLeft > 0 || resending}
              accessibilityRole="button"
              accessibilityState={{ disabled: secondsLeft > 0 || resending, busy: resending }}
              style={styles.linkButton}
            >
              <Text style={secondsLeft > 0 || resending ? styles.disabledLink : styles.link}>
                {resending
                  ? 'Skickar ny kod…'
                  : secondsLeft > 0
                    ? `Skicka ny kod (${secondsLeft})`
                    : 'Skicka ny kod'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace('/(auth)')}
              accessibilityRole="button"
              style={styles.linkButton}
            >
              <Text style={styles.link}>Ändra e-postadress</Text>
            </Pressable>
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
  brand: { color: colors.brand.primary, marginBottom: spacing.xl },
  title: { color: colors.brand.primary },
  intro: { marginTop: spacing.md, lineHeight: 24 },
  form: { gap: spacing.md, marginTop: spacing.xl },
  linkButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  link: { color: colors.brand.primary, textDecorationLine: 'underline' },
  disabledLink: { color: colors.text.muted },
});
