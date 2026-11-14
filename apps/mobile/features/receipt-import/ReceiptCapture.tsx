import { Button, colors, radius, spacing, Text } from '@cena/ui';
import type { ImagePickerAsset } from 'expo-image-picker';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

export interface ReceiptCaptureProps {
  asset: ImagePickerAsset | null;
  rotation: number;
  busy: boolean;
  analyzing: boolean;
  onChoose(source: 'camera' | 'library'): void;
  onRotate(): void;
  onRead(): void;
  onCancel(): void;
}

export function ReceiptCapture({
  asset,
  rotation,
  busy,
  analyzing,
  onChoose,
  onRotate,
  onRead,
  onCancel,
}: ReceiptCaptureProps) {
  return (
    <View style={styles.content}>
      <Text>
        Fotografera hela kvittot eller välj en bild. Du granskar och väljer varorna innan något
        läggs till i ditt kök.
      </Text>
      {analyzing ? (
        <Text variant="bodySmall" tone="muted">
          Första läsningen kan ta längre tid medan appens OCR-filer hämtas.
        </Text>
      ) : null}
      <Button label="Ta foto av kvitto" disabled={busy} onPress={() => onChoose('camera')} />
      <Button
        label="Välj från bilder"
        variant="outline"
        disabled={busy}
        onPress={() => onChoose('library')}
      />
      {asset ? (
        <>
          <View style={styles.preview}>
            <Image
              source={{ uri: asset.uri }}
              resizeMode="contain"
              accessibilityLabel="Förhandsvisning av kvitto"
              style={[styles.image, { transform: [{ rotate: `${rotation}deg` }] }]}
            />
          </View>
          <Button label="Rotera kvitto" variant="outline" disabled={busy} onPress={onRotate} />
          <Button label="Läs kvitto" disabled={busy} onPress={onRead} />
        </>
      ) : null}
      {busy ? (
        <View style={styles.loading}>
          <ActivityIndicator
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={analyzing ? 'Läser kvittot' : 'Väntar'}
            color={colors.brand.primary}
          />
          <Text>{analyzing ? 'Läser kvittot...' : 'Väntar...'}</Text>
          {analyzing ? (
            <Button label="Avbryt läsning" variant="outline" onPress={onCancel} />
          ) : null}
        </View>
      ) : null}
      <Text variant="caption" tone="muted">
        Texten läses på din enhet. Bilden skickas inte till en AI-tjänst. Inga utgångsdatum hämtas
        från kvittot.
      </Text>
      <Text variant="caption" tone="muted">
        Första gången hämtas OCR-motorn och svenska språkfiler som en del av appen. Själva
        kvittoläsningen görs lokalt, utan att bilden eller texten laddas upp.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.base },
  preview: {
    height: 320,
    overflow: 'hidden',
    borderRadius: radius.card,
    backgroundColor: colors.background.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', maxWidth: 280, aspectRatio: 1 },
  loading: { gap: spacing.md, alignItems: 'center' },
});
