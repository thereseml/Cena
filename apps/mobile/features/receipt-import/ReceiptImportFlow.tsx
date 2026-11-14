import * as ImagePicker from 'expo-image-picker';
import type { SaveInventoryItemInput } from '@cena/contracts';
import { router, usePreventRemove } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors, EmptyState, IconButton, ScreenHeader, spacing, Text } from '@cena/ui';
import { useAuth } from '../auth/AuthProvider';
import { readReceipt, removeReceiptTempFiles } from './receipt-ocr';
import { importReceiptItems } from './receipt-import-api';
import { ReceiptCapture } from './ReceiptCapture';
import { ReceiptReview } from './ReceiptReview';
import { ReceiptOcrEngine, type ReceiptOcrEngineHandle } from './ReceiptOcrEngine';
import {
  receiptErrorMessage,
  reviewItemError,
  toInventoryInput,
  toReviewItem,
  type ReceiptReviewItem,
} from './receipt-review';

export function ReceiptImportFlow() {
  const { profile } = useAuth();
  const householdId = profile?.households[0]?.id;
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [rotation, setRotation] = useState(0);
  const [items, setItems] = useState<ReceiptReviewItem[]>([]);
  const [lines, setLines] = useState<string[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [physicalPending, setPhysicalPending] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unresolved, setUnresolved] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const mounted = useRef(false);
  const generation = useRef(0);
  const ocrPending = useRef(false);
  const ocrEngine = useRef<ReceiptOcrEngineHandle>(null);
  const ocrAbort = useRef<AbortController | null>(null);
  const pickerPending = useRef(false);
  const savePending = useRef(false);
  const saved = useRef(false);
  const request = useRef<{
    householdId: string;
    payload: SaveInventoryItemInput[];
    key: string;
  } | null>(null);
  const manualId = useRef(0);

  const disablePrevention = usePreventRemove(saving || (unresolved && !completed), () => {
    if (!savePending.current && request.current && !saved.current) checkKitchen();
  });

  useEffect(() => {
    mounted.current = true;
    const initialGeneration = ++generation.current;
    void ImagePicker.getPendingResultAsync()
      .then((result) => {
        if (!mounted.current || generation.current !== initialGeneration || !result) return;
        if ('canceled' in result) {
          if (!result.canceled && result.assets?.[0]) setAsset(result.assets[0]);
          else setMessage('Bildvalet avbröts. Inget har lagts till.');
        } else setError('Bilden kunde inte återställas. Välj den igen.');
      })
      .catch(() => {
        if (mounted.current && generation.current === initialGeneration)
          setError('Bilden kunde inte återställas. Välj den igen.');
      });
    return () => {
      mounted.current = false;
      ocrAbort.current?.abort();
      if (!ocrPending.current) removeReceiptTempFiles();
    };
  }, []);

  async function choose(source: 'camera' | 'library') {
    if (ocrPending.current || pickerPending.current || request.current || saved.current) return;
    pickerPending.current = true;
    setPicking(true);
    const token = ++generation.current;
    setError(null);
    setMessage(null);
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!mounted.current || token !== generation.current) return;
        if (!permission.granted) {
          setError('Kameratillgång nekades. Tillåt kameran i inställningarna eller välj en bild.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
        exif: false,
        selectionLimit: 1,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (!mounted.current || token !== generation.current) return;
      if (result.canceled || !result.assets?.[0]) {
        setMessage('Bildvalet avbröts. Inget har lagts till.');
        return;
      }
      setAsset(result.assets[0]);
      setRotation(0);
      setItems([]);
      setLines([]);
    } catch {
      if (mounted.current && token === generation.current)
        setError('Bilden kunde inte öppnas. Försök igen eller lägg till manuellt.');
    } finally {
      pickerPending.current = false;
      if (mounted.current) setPicking(false);
    }
  }

  async function read() {
    if (!asset || ocrPending.current || pickerPending.current || request.current || saved.current)
      return;
    ocrPending.current = true;
    const controller = new AbortController();
    ocrAbort.current = controller;
    const token = ++generation.current;
    setPhysicalPending(true);
    setAnalyzing(true);
    setError(null);
    setMessage(null);
    try {
      const receipt = await readReceipt(
        asset,
        rotation,
        (dataUrl) => {
          if (!ocrEngine.current) throw new Error('OCR_UNAVAILABLE');
          return ocrEngine.current.recognize(dataUrl);
        },
        controller.signal,
      );
      if (!mounted.current || token !== generation.current) return;
      setItems(receipt.products.map(toReviewItem));
      setLines(receipt.unrecognizedLines);
      setReviewing(true);
    } catch (failure) {
      if (mounted.current && token === generation.current) setError(receiptErrorMessage(failure));
    } finally {
      // Image preparation must settle before its temporary files can be deleted.
      ocrPending.current = false;
      ocrAbort.current = null;
      removeReceiptTempFiles();
      if (mounted.current) {
        setPhysicalPending(false);
        setAnalyzing(false);
      }
    }
  }

  function add(text = '') {
    if (request.current || saved.current) return;
    const item = toReviewItem({
      id: `manual-${++manualId.current}`,
      name: text,
      originalText: text,
      quantity: null,
      unit: null,
      price: null,
      classification: 'UNKNOWN',
      storageLocation: null,
    });
    setItems((current) => [...current, item]);
  }

  const selected = items.filter((item) => item.selected && item.classification !== 'NON_FOOD');
  const valid =
    selected.length > 0 &&
    selected.length <= 30 &&
    selected.every((item) => !reviewItemError(item));

  async function save() {
    if (savePending.current || saved.current) return;
    if (!request.current) {
      if (!householdId || !valid) return;
      // A lost response may follow a committed write. Never replace this submission on retry.
      request.current = {
        householdId,
        payload: selected.map(toInventoryInput),
        key: `receipt:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`,
      };
      setUnresolved(true);
    }
    const submission = request.current;
    savePending.current = true;
    setSaving(true);
    setError(null);
    try {
      await importReceiptItems(submission.householdId, submission.payload, submission.key);
      saved.current = true;
      if (mounted.current) setCompleted(true);
    } catch {
      if (mounted.current)
        setError(
          'Resultatet är osäkert. Varorna kan redan ha sparats. Försök samma import igen för att bekräfta resultatet utan att lägga till dem dubbelt. Varorna är låsta tills resultatet är bekräftat. Du kan också lämna importen och kontrollera Mitt kök.',
        );
    } finally {
      savePending.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  function checkKitchen() {
    if (savePending.current || saved.current) return;
    Alert.alert(
      'Lämna importen och kontrollera Mitt kök?',
      'Varorna kan redan ha sparats. Kontrollera Mitt kök innan du importerar kvittot igen, annars kan samma varor läggas till dubbelt.',
      [
        { text: 'Stanna kvar', style: 'cancel' },
        {
          text: 'Kontrollera Mitt kök',
          onPress: () => {
            if (savePending.current || saved.current) return;
            saved.current = true;
            setUnresolved(false);
            disablePrevention();
            router.replace('/(tabs)/kitchen');
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <IconButton
          accessibilityLabel="Tillbaka"
          icon={<ArrowLeft size={20} color={colors.brand.primary} />}
          disabled={saving}
          onPress={() => {
            if (savePending.current) return;
            if (request.current && !saved.current) {
              checkKitchen();
              return;
            }
            if (reviewing && !completed) {
              setReviewing(false);
              setError(null);
            } else router.back();
          }}
        />
        <ScreenHeader title={reviewing ? 'Granska kvitto' : 'Lägg till med kvitto'} />
        {completed ? (
          <EmptyState
            title="Varorna är tillagda"
            description="Dina valda varor finns nu i Mitt kök."
            action={
              <Button label="Till Mitt kök" onPress={() => router.replace('/(tabs)/kitchen')} />
            }
          />
        ) : reviewing ? (
          <>
            <ReceiptReview
              items={items}
              unrecognizedLines={lines}
              disabled={saving || unresolved}
              onChange={(item) => {
                if (!request.current && !saved.current)
                  setItems((current) => current.map((row) => (row.id === item.id ? item : row)));
              }}
              onRemove={(id) => {
                if (!request.current && !saved.current)
                  setItems((current) => current.filter((row) => row.id !== id));
              }}
              onAdd={add}
              onConvertLine={(index) => {
                if (request.current || saved.current) return;
                add(lines[index]);
                setLines((current) => current.filter((_, position) => position !== index));
              }}
            />
            {selected.length > 30 ? (
              <Text accessibilityRole="alert">
                Du kan lägga till högst 30 varor åt gången. Avmarkera varor tills högst 30 är valda.
                Alla kvittorader finns kvar för granskning.
              </Text>
            ) : null}
            {!householdId ? (
              <Text accessibilityRole="alert">
                Du behöver ett hushåll för att lägga till varor.
              </Text>
            ) : null}
            <Button
              label={
                unresolved
                  ? `Försök samma import igen (${selected.length})`
                  : `Lägg till i Mitt kök (${selected.length})`
              }
              loading={saving}
              disabled={!unresolved && (!valid || !householdId)}
              onPress={() => void save()}
            />
            <Button
              label="Välj en annan bild"
              variant="outline"
              disabled={saving || unresolved}
              onPress={() => {
                if (request.current || saved.current) return;
                setReviewing(false);
                setError(null);
              }}
            />
            {unresolved ? (
              <Button
                label="Kontrollera Mitt kök"
                variant="outline"
                disabled={saving}
                onPress={checkKitchen}
              />
            ) : null}
          </>
        ) : (
          <>
            <ReceiptCapture
              asset={asset}
              rotation={rotation}
              busy={physicalPending || picking}
              analyzing={analyzing}
              onChoose={(source) => void choose(source)}
              onRotate={() => setRotation((angle) => (angle + 90) % 360)}
              onRead={() => void read()}
              onCancel={() => {
                generation.current++;
                ocrAbort.current?.abort();
                ocrEngine.current?.cancel();
                setAnalyzing(false);
                setMessage('Läsningen avbröts. Inget har lagts till.');
              }}
            />
            <Button
              label="Lägg till manuellt"
              variant="outline"
              disabled={picking}
              onPress={() => router.push('/add-product')}
            />
          </>
        )}
        {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </ScrollView>
      <ReceiptOcrEngine ref={ocrEngine} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary },
  content: { padding: spacing.lg, gap: spacing.base, paddingBottom: spacing.xxl },
  error: { color: colors.semantic.error },
});
