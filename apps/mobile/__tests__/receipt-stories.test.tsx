import { render } from '@testing-library/react-native';
import { ReceiptProductCard } from '../features/receipt-import/ReceiptProductCard';
import cardMeta, * as cardStories from '../features/receipt-import/ReceiptProductCard.stories';
import { ReceiptCapture } from '../features/receipt-import/ReceiptCapture';
import captureMeta, * as captureStories from '../features/receipt-import/ReceiptCapture.stories';
import { ReceiptReview } from '../features/receipt-import/ReceiptReview';
import reviewMeta, * as reviewStories from '../features/receipt-import/ReceiptReview.stories';

it('renders the card Storybook states, including unknown, missing storage, disabled and long names', async () => {
  for (const story of [
    cardStories.Checked,
    cardStories.Unchecked,
    cardStories.Unknown,
    cardStories.MissingStorage,
    cardStories.SuggestedAmount,
    cardStories.Disabled,
    cardStories.InvalidQuantity,
    cardStories.LongName,
  ]) {
    const screen = await render(<ReceiptProductCard {...cardMeta.args} {...story.args} />);
    expect(screen.getByText(/Originaltext:/)).toBeTruthy();
    expect(screen.getByRole('checkbox').props.accessibilityState).toMatchObject({
      checked: (story.args?.item ?? cardMeta.args.item).selected,
    });
    await screen.unmount();
  }
});

it('renders capture Storybook default, loading and neutral waiting states', async () => {
  for (const story of [captureStories.Default, captureStories.Loading, captureStories.Waiting]) {
    const screen = await render(<ReceiptCapture {...captureMeta.args} {...story.args} />);
    expect(screen.getByLabelText('Ta foto av kvitto')).toBeTruthy();
    if (story === captureStories.Waiting) {
      expect(screen.getByText('Väntar...')).toBeTruthy();
      expect(screen.queryByText(/avbrutna/)).toBeNull();
    }
    await screen.unmount();
  }
});

it('renders review Storybook default, empty, uncertain, other rows and disabled states', async () => {
  for (const story of [
    reviewStories.Default,
    reviewStories.Empty,
    reviewStories.ReviewNeeded,
    reviewStories.ManuallySelectedUnknown,
    reviewStories.OtherAndUnrecognized,
    reviewStories.Disabled,
  ]) {
    const screen = await render(<ReceiptReview {...reviewMeta.args} {...story.args} />);
    expect(screen.getByText('Lägg till en vara manuellt')).toBeTruthy();
    await screen.unmount();
  }
});
