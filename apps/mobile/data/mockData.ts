export interface RecipeSuggestion {
  id: string;
  name: string;
  description: string;
  minutes: number;
  availableIngredients: number;
  totalIngredients: number;
  note: string;
}

export const MOCK_RECIPES: RecipeSuggestion[] = [
  {
    id: 'tomato-pasta',
    name: 'Pasta med rostade tomater',
    description: 'En enkel vardagsfavorit med smör och färska örter.',
    minutes: 25,
    availableIngredients: 4,
    totalIngredients: 5,
    note: 'Du har det mesta hemma',
  },
  {
    id: 'frittata',
    name: 'Krämig frittata',
    description: 'Ägg, tomat och en klick smör blir en fin lunch.',
    minutes: 20,
    availableIngredients: 3,
    totalIngredients: 4,
    note: 'Bra sätt att använda tomaterna',
  },
];

export const MOCK_SHOPPING_ITEMS = ['Havregryn', 'Citroner', 'Färsk basilika', 'Parmesan'];
