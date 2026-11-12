import { fireEvent, render } from '@testing-library/react-native';
import { Button, Input } from '@cena/ui';

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
});
