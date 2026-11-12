import { router } from 'expo-router';
import { ArrowLeft, Camera, Keyboard } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors, spacing, Text } from '@cena/ui';

export default function AddProductScreen() {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
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
        <Text style={styles.intro}>
          Snart kan du lägga in varor manuellt eller ta en bild. Inget sparas i den här
          förhandsvisningen.
        </Text>

        <View style={styles.option}>
          <Keyboard size={22} color={colors.brand.primary} strokeWidth={1.8} />
          <View style={styles.optionCopy}>
            <Text variant="h3" style={styles.optionTitle}>
              Skriv in en vara
            </Text>
            <Text variant="bodySmall">Manuell registrering kommer senare.</Text>
          </View>
        </View>
        <View style={styles.option}>
          <Camera size={22} color={colors.brand.primary} strokeWidth={1.8} />
          <View style={styles.optionCopy}>
            <Text variant="h3" style={styles.optionTitle}>
              Ta en bild
            </Text>
            <Text variant="bodySmall">Kamerafunktionen finns inte ännu.</Text>
          </View>
        </View>

        <Button
          label="Tillbaka till mitt kök"
          variant="secondary"
          onPress={() => router.replace('/(tabs)/kitchen')}
          style={styles.returnButton}
        />
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
  option: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  optionCopy: { flex: 1, gap: spacing.xs },
  optionTitle: { color: colors.brand.primary },
  returnButton: { alignSelf: 'flex-start', marginTop: spacing.xl },
});
