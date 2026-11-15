import type { RecipeAvailabilitySummary } from '@cena/contracts';
import { Text } from '@cena/ui';

export function RecipeAvailability({
  availability,
}: {
  availability: RecipeAvailabilitySummary | null;
}) {
  if (!availability) return <Text variant="bodySmall">Tillgång i köket är okänd.</Text>;
  return (
    <Text variant="bodySmall">
      {`${availability.available} av ${availability.total} ingredienser finns hemma. ${availability.partial} finns delvis, ${availability.missing} saknas, ${availability.unknown} har okänd tillgång.`}
    </Text>
  );
}
