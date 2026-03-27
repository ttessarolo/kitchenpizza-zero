export interface LocalRecipe {
  id: number
  name: string
  description: string
  ingredients: string[]
  steps: string[]
}

export const recipes: LocalRecipe[] = [
  {
    id: 1,
    name: 'Pizza Margherita',
    description: 'La classica pizza napoletana con pomodoro, mozzarella e basilico.',
    ingredients: [
      'Farina 00 - 500g',
      'Acqua - 325ml',
      'Lievito di birra - 3g',
      'Sale - 10g',
      'Pomodoro San Marzano - 400g',
      'Mozzarella di bufala - 250g',
      'Basilico fresco',
      'Olio extravergine di oliva',
    ],
    steps: [
      "Impastare farina, acqua, lievito e sale. Lasciar lievitare 8 ore.",
      "Stendere l'impasto a mano formando un disco.",
      'Condire con salsa di pomodoro.',
      'Cuocere in forno a 450°C per 60-90 secondi.',
      "Aggiungere mozzarella a pezzi, basilico e un filo d'olio.",
    ],
  },
]
