import { fireEvent, render } from '@testing-library/react-native';
import {
  ActionRow,
  Badge,
  Button,
  EmptyState,
  FilterChip,
  IconButton,
  Input,
  ListItem,
  StatCard,
  Text,
} from '@cena/ui';

describe('UI accessibility and interaction states', () => {
  it('prevents a disabled button from pressing and announces it as disabled', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <Button
        label="Lägg till vara"
        disabled
        onPress={onPress}
        accessibilityState={{ disabled: false }}
      />,
    );
    const button = getByRole('button', { name: 'Lägg till vara' });

    expect(button.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('prevents a loading button from pressing and announces its busy state', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(<Button label="Sparar" loading onPress={onPress} />);
    const button = getByRole('button', { name: 'Sparar' });

    expect(button.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('keeps a leading icon decorative while the button label remains its accessible name', async () => {
    const { getByRole, queryByText } = await render(
      <Button label="Skanna kvitto" leadingIcon={<Text accessibilityLabel="Kameraikon">+</Text>} />,
    );
    const button = getByRole('button', { name: 'Skanna kvitto' });

    expect(button).toBeTruthy();
    expect(queryByText('Kameraikon')).toBeNull();
  });

  it('supports a compact input with an explicit accessible label and decorative leading icon', async () => {
    const { getByLabelText, queryByText } = await render(
      <Input
        accessibilityLabel="Sök i ditt kök"
        placeholder="Sök efter mat..."
        leadingIcon={<Text>⌕</Text>}
      />,
    );

    expect(getByLabelText('Sök i ditt kök')).toBeTruthy();
    expect(queryByText('⌕')).toBeTruthy();
    expect(queryByText('Sök i ditt kök')).toBeNull();
  });

  it('keeps a non-editable input announced as disabled and exposes its error hint', async () => {
    const { getByLabelText } = await render(
      <Input
        label="Livsmedel"
        editable={false}
        error="Ange ett livsmedel"
        accessibilityState={{ disabled: false }}
      />,
    );
    const input = getByLabelText('Livsmedel');

    expect(input.props.accessibilityState.disabled).toBe(true);
    expect(input.props.accessibilityHint).toBe('Ange ett livsmedel');
  });

  it('announces icon button labels and prevents disabled presses', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <IconButton
        icon={<Text>+</Text>}
        accessibilityLabel="Lägg till mat"
        disabled
        onPress={onPress}
      />,
    );
    const button = getByRole('button', { name: 'Lägg till mat' });

    expect(button.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('exposes selected and disabled filter chip states', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <FilterChip label="Kylskåp" selected disabled onPress={onPress} />,
    );
    const chip = getByRole('button', { name: 'Kylskåp' });

    expect(chip.props.accessibilityState).toMatchObject({ selected: true, disabled: true });
    fireEvent.press(chip);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('keeps action row title and description available to assistive technology', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <ActionRow
        title="Lägg till mat"
        description="Håll koll på det du har hemma"
        onPress={onPress}
      />,
    );
    const row = getByRole('button', { name: /Lägg till mat/ });

    fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders stat labels, empty-state content, and status badge text', async () => {
    const { getByText, getByLabelText } = await render(
      <>
        <StatCard items={[{ value: 6, label: 'varor hemma' }]} />
        <EmptyState title="Ditt kök är tomt" description="Lägg till en vara för att komma igång." />
        <Badge label="Använd snart" variant="warning" />
      </>,
    );

    expect(getByText('varor hemma')).toBeTruthy();
    expect(getByText('Ditt kök är tomt')).toBeTruthy();
    expect(getByLabelText('Använd snart')).toBeTruthy();
  });

  it('preserves checkbox accessibility state through the list row primitive', async () => {
    const { getByRole } = await render(
      <ListItem
        accessibilityRole="checkbox"
        accessibilityLabel="Havregryn"
        accessibilityState={{ checked: true }}
      >
        <Text>Havregryn</Text>
      </ListItem>,
    );

    expect(getByRole('checkbox', { name: 'Havregryn' }).props.accessibilityState.checked).toBe(
      true,
    );
  });
});
