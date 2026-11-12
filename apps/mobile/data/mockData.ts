export interface KitchenProduct {
  id: string;
  name: string;
  quantity: string;
  location: 'Kylskåp' | 'Skafferi' | 'Frys';
  expires?: string;
  expiringSoon?: boolean;
}

export interface RecipeSuggestion {
  id: string;
  name: string;
  description: string;
  minutes: number;
  availableIngredients: number;
  totalIngredients: number;
  note: string;
}

export const MOCK_PRODUCTS: KitchenProduct[] = [
  {
    id: 'milk',
    name: 'Mjölk',
    quantity: '1 liter',
    location: 'Kylskåp',
    expires: 'Bäst före imorgon',
    expiringSoon: true,
  },
  { id: 'eggs', name: 'Ägg', quantity: '6 st', location: 'Kylskåp', expires: 'Bäst före 18 nov' },
  { id: 'butter', name: 'Smör', quantity: '250 g', location: 'Kylskåp' },
  {
    id: 'tomatoes',
    name: 'Tomater',
    quantity: '4 st',
    location: 'Kylskåp',
    expires: 'Använd snart',
    expiringSoon: true,
  },
  { id: 'pasta', name: 'Pasta', quantity: '500 g', location: 'Skafferi' },
  { id: 'chicken', name: 'Kycklingfilé', quantity: '400 g', location: 'Frys' },
];

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
