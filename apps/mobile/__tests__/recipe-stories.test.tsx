import { render } from '@testing-library/react-native';
import { RecipePreview } from '../components/RecipePreview';
import previewMeta, * as previews from '../components/RecipePreview.stories';
import { RecipeResults } from '../features/recipes/RecipeResults';
import resultsMeta, * as results from '../features/recipes/RecipeResults.stories';
import { RecipeDetails } from '../features/recipes/RecipeDetails';
import detailsMeta, * as details from '../features/recipes/RecipeDetails.stories';
import { RecipeAvailability } from '../features/recipes/RecipeAvailability';
import availabilityMeta, * as availability from '../features/recipes/RecipeAvailability.stories';

jest.mock('lucide-react-native', () => ({ ArrowRight: () => null, Clock3: () => null }));

it('renders availability stories as counts, including unknown and partially available ingredients', async () => {
  for (const story of [availability.SomeMissing, availability.AllAvailable, availability.Unknown]) {
    const screen = await render(<RecipeAvailability {...availabilityMeta.args} {...story.args} />);
    if (story === availability.Unknown)
      expect(screen.getByText('Tillgång i köket är okänd.')).toBeTruthy();
    else expect(screen.getByText(/av 4 ingredienser finns hemma/)).toBeTruthy();
    await screen.unmount();
  }
});

it('renders all preview stories with honest availability and full titles', async () => {
  for (const story of [
    previews.Default,
    previews.LongerDescription,
    previews.FewerIngredientsAvailable,
    previews.AllAvailable,
    previews.Unknown,
    previews.LongTitle,
  ]) {
    const props = { ...previewMeta.args, ...story.args };
    const screen = await render(<RecipePreview {...props} />);
    expect(screen.getByLabelText(`Visa receptet ${props.recipe.title}`)).toBeTruthy();
    expect(
      screen.getByText(
        `${props.recipe.totalMinutes} min totalt · ${props.recipe.servings} portioner`,
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/%/)).toBeNull();
    await screen.unmount();
  }
});

it('renders result stories for loading, failure, empty, long, missing, available, unknown and paging', async () => {
  for (const story of [
    results.Default,
    results.Loading,
    results.Error,
    results.Empty,
    results.AwaitingEditorialReview,
    results.LongTitle,
    results.AllAvailable,
    results.Unknown,
    results.Paging,
  ]) {
    const props = { ...resultsMeta.args, ...story.args };
    const screen = await render(<RecipeResults {...props} />);
    if (props.loading) expect(screen.getByLabelText('Läser in recept')).toBeTruthy();
    else if (props.error) expect(screen.getByText('Försök igen')).toBeTruthy();
    else if (props.data?.total === 0 && props.emptyTitle) {
      expect(screen.getByText(props.emptyTitle)).toBeTruthy();
    } else expect(screen.getByText(/Sida 1 av/)).toBeTruthy();
    await screen.unmount();
  }
});

it('renders all detail stories and labels unknown availability rather than claiming it is present', async () => {
  for (const story of [
    details.SomeMissing,
    details.Loading,
    details.Error,
    details.Empty,
    details.LongTitle,
    details.AllAvailable,
    details.Unknown,
  ]) {
    const props = { ...detailsMeta.args, ...story.args };
    const screen = await render(<RecipeDetails {...props} />);
    if (props.loading) expect(screen.getByLabelText('Läser in receptdetaljer')).toBeTruthy();
    else if (props.error) expect(screen.getByText('Försök igen')).toBeTruthy();
    else if (props.data) expect(screen.getByText(/inte verifierat som allergisäkert/)).toBeTruthy();
    if (story === details.Unknown) expect(screen.getAllByText('Okänd tillgång')).toHaveLength(4);
    await screen.unmount();
  }
});
