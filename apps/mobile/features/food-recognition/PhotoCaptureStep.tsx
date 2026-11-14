import { ActivityIndicator, Image, ScrollView, StyleSheet, View } from 'react-native';
import { Button, colors, spacing, Text } from '@cena/ui';

export interface PhotoCaptureStepProps {
  imageUri: string | null;
  analyzing: boolean;
  error: string | null;
  onChoosePhoto(source: 'camera' | 'library'): void;
  onReplacePhoto(): void;
  onAnalyze(): void;
  onCancelAnalysis(): void;
  onAddManually(): void;
}

export function PhotoCaptureStep({
  imageUri,
  analyzing,
  error,
  onChoosePhoto,
  onReplacePhoto,
  onAnalyze,
  onCancelAnalysis,
  onAddManually,
}: PhotoCaptureStepProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>
        Ta en bild med flera matvaror så hjälper Cena dig att känna igen dem.
      </Text>
      <View style={styles.photoActions}>
        <Button
          label="Ta foto"
          onPress={() => onChoosePhoto('camera')}
          disabled={analyzing}
          style={styles.photoButton}
        />
        <Button
          label="Välj från bilder"
          variant="outline"
          onPress={() => onChoosePhoto('library')}
          disabled={analyzing}
          style={styles.photoButton}
        />
      </View>

      {imageUri ? (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.preview}
            resizeMode="cover"
            accessibilityLabel="Förhandsvisning av vald matbild"
          />
          <Button
            label="Byt bild"
            variant="outline"
            onPress={onReplacePhoto}
            disabled={analyzing}
          />
        </View>
      ) : null}

      {analyzing ? (
        <View
          style={styles.loading}
          accessibilityRole="progressbar"
          accessibilityLabel="Cena analyserar bilden"
        >
          <ActivityIndicator color={colors.brand.primary} />
          <Text variant="h3">Cena tittar på din bild...</Text>
          <Text variant="bodySmall" tone="muted">
            Det kan ta en liten stund.
          </Text>
          <Button label="Avbryt" variant="outline" onPress={onCancelAnalysis} />
        </View>
      ) : imageUri ? (
        <Button label="Analysera bild" onPress={onAnalyze} />
      ) : null}

      <Text variant="caption" tone="muted" style={styles.privacyNotice}>
        När du analyserar skickas bilden till en extern AI-tjänst, Cloudflare Workers AI. Bilden
        sparas inte i Cena.
      </Text>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {error ? (
        <Button label="Lägg till manuellt" variant="outline" onPress={onAddManually} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  intro: { lineHeight: 24 },
  photoActions: { gap: spacing.sm },
  photoButton: { width: '100%' },
  previewContainer: { gap: spacing.sm },
  preview: {
    width: '100%',
    height: 280,
    borderRadius: 20,
    backgroundColor: colors.background.subtle,
  },
  loading: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  privacyNotice: { lineHeight: 18 },
  error: { color: colors.semantic.error },
});
