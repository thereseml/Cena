import { fireEvent, render } from '@testing-library/react-native';
import { Checkbox } from '@cena/ui';
import meta, {
  Checked,
  Unchecked,
  Disabled,
  LongLabel,
} from '../../../packages/ui/src/Checkbox.stories';

it('announces checkbox state and invokes its controlled selection handler', async () => {
  const onPress = jest.fn();
  const screen = await render(<Checkbox label="Välj mjölk" checked={false} onPress={onPress} />);
  const checkbox = screen.getByRole('checkbox', { name: 'Välj mjölk' });
  expect(checkbox).not.toBeChecked();
  expect(checkbox).toBeEnabled();
  expect(checkbox).toHaveStyle({ minHeight: 48, minWidth: 48 });
  await fireEvent.press(checkbox);
  expect(onPress).toHaveBeenCalledTimes(1);
  await screen.rerender(<Checkbox label="Välj mjölk" checked onPress={onPress} />);
  expect(screen.getByRole('checkbox', { name: 'Välj mjölk' })).toBeChecked();
});

it('preserves accurate checked and disabled semantics and blocks disabled presses', async () => {
  const onPress = jest.fn();
  const screen = await render(
    <Checkbox
      label="Mjölk"
      checked
      disabled
      onPress={onPress}
      accessibilityState={{ checked: false, disabled: false }}
    />,
  );
  const checkbox = screen.getByRole('checkbox', { name: 'Mjölk' });
  expect(checkbox).toBeChecked();
  expect(checkbox).toBeDisabled();
  await fireEvent.press(checkbox);
  expect(onPress).not.toHaveBeenCalled();
});

it('allows labels to wrap and scale without a fixed text height or line limit', async () => {
  const label = 'Välj ekologisk mellanmjölk med en längre beskrivning som behöver flera rader';
  const screen = await render(<Checkbox label={label} />);
  const text = screen.getByText(label);
  expect(text).toHaveProp('allowFontScaling', true);
  expect(text.props.numberOfLines).toBeUndefined();
  expect(text).toHaveStyle({ flex: 1, minWidth: 0 });
  expect(screen.getByRole('checkbox', { name: label })).not.toBeChecked();
});

it('renders each Checkbox Storybook state with the expected accessible state', async () => {
  for (const story of [Checked, Unchecked, Disabled, LongLabel]) {
    const args = { ...meta.args, ...story.args };
    const screen = await render(<Checkbox {...args} />);
    expect(
      screen.getByRole('checkbox', { name: args.label }).props.accessibilityState,
    ).toMatchObject({
      checked: args.checked,
      disabled: Boolean(args.disabled),
    });
    await screen.unmount();
  }
});
