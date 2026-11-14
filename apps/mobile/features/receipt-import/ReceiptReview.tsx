import { Badge, Button, Card, EmptyState, spacing, Text } from '@cena/ui';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ReceiptProductCard } from './ReceiptProductCard';
import type { ReceiptReviewItem } from './receipt-review';

export interface ReceiptReviewProps {
  items: ReceiptReviewItem[];
  unrecognizedLines: string[];
  disabled: boolean;
  onChange(item: ReceiptReviewItem): void;
  onRemove(id: string): void;
  onAdd(text?: string): void;
  onConvertLine(index: number): void;
}

export function ReceiptReview({
  items,
  unrecognizedLines,
  disabled,
  onChange,
  onRemove,
  onAdd,
  onConvertLine,
}: ReceiptReviewProps) {
  const [showNonFood, setShowNonFood] = useState(false);
  const [showLines, setShowLines] = useState(false);
  const food = items.filter((item) => item.classification === 'FOOD');
  const unknown = items.filter((item) => item.classification === 'UNKNOWN');
  const nonFood = items.filter((item) => item.classification === 'NON_FOOD');
  function renderItem(item: ReceiptReviewItem) {
    return (
      <ReceiptProductCard
        key={item.id}
        item={item}
        disabled={disabled}
        onChange={onChange}
        onRemove={() => onRemove(item.id)}
      />
    );
  }
  return (
    <View style={styles.content}>
      <Text>Kontrollera varorna innan du lägger till dem i ditt kök.</Text>
      <Text variant="bodySmall">
        Välj vilka varor du vill lägga till. Du kan ändra namn, mängd, enhet och förvaring.
      </Text>
      {!food.length ? (
        <EmptyState
          title="Inga matvaror hittades"
          description="Granska osäkra rader, prova en annan bild eller lägg till en vara manuellt."
        />
      ) : null}
      {food.map(renderItem)}
      {unknown.length ? (
        <>
          <Text variant="h2" accessibilityRole="header">
            Behöver granskas
          </Text>
          <Text variant="bodySmall">
            Raderna väljs inte automatiskt. Kontrollera att de är matvaror innan du väljer dem.
          </Text>
          {unknown.map(renderItem)}
        </>
      ) : null}
      {nonFood.length ? (
        <>
          <Button
            label={`Övriga varor (${nonFood.length})`}
            variant="outline"
            disabled={disabled}
            accessibilityState={{ expanded: showNonFood }}
            onPress={() => setShowNonFood(!showNonFood)}
          />
          {showNonFood
            ? nonFood.map((item) => (
                <Card key={item.id} style={styles.content}>
                  <Text variant="h3">{item.name}</Text>
                  <Text>Originaltext: {item.originalText}</Text>
                  <Badge label="Inte livsmedel" />
                  <Text variant="caption">Kan inte läggas till i köket från kvittot.</Text>
                </Card>
              ))
            : null}
        </>
      ) : null}
      {unrecognizedLines.length ? (
        <>
          <Button
            label={`Otolkade rader (${unrecognizedLines.length})`}
            variant="outline"
            disabled={disabled}
            accessibilityState={{ expanded: showLines }}
            onPress={() => setShowLines(!showLines)}
          />
          {showLines
            ? unrecognizedLines.map((line, index) => (
                <Card key={index} style={styles.content}>
                  <Text>{line}</Text>
                  <Button
                    label={`Granska rad ${index + 1} som vara`}
                    variant="outline"
                    disabled={disabled}
                    onPress={() => onConvertLine(index)}
                  />
                </Card>
              ))
            : null}
        </>
      ) : null}
      <Button
        label="Lägg till en vara manuellt"
        variant="outline"
        disabled={disabled}
        onPress={() => onAdd()}
      />
    </View>
  );
}

const styles = StyleSheet.create({ content: { gap: spacing.base } });
