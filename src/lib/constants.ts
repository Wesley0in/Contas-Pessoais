export const CATEGORIES = {
  income: [
    { key: 'salary_liz', label: 'Salário Liz' },
    { key: 'salary_wesley', label: 'Salário Wesley' },
    { key: 'pension_liz', label: 'Pensão Liz' },
    { key: 'benefits', label: 'Benefícios' },
    { key: 'extra_income_wesley', label: 'Renda Extra Wesley' },
  ],
  expense: [
    { key: 'credit_card', label: 'Cartão de Crédito' },
    { key: 'macbook', label: 'Macbook (parcela)' },
    { key: 'rent', label: 'Aluguel (QuintoAndar)' },
    { key: 'condo', label: 'Condomínio' },
    { key: 'transport', label: 'Transporte' },
    { key: 'electricity', label: 'Luz' },
    { key: 'phone', label: 'Telefone' },
    { key: 'storage', label: 'Armazenamento' },
    { key: 'pet', label: 'Lulu' },
    { key: 'therapy', label: 'Terapia' },
    { key: 'streaming', label: 'Spotify' },
  ],
} as const;

export const ALL_CATEGORIES = [...CATEGORIES.income, ...CATEGORIES.expense];

export const getCategoryLabel = (key: string): string => {
  const found = ALL_CATEGORIES.find(c => c.key === key);
  return found?.label ?? key;
};

export const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'food_card', label: 'Cartão de Alimentação' },
  { value: 'pix', label: 'PIX' },
  { value: 'ted', label: 'TED' },
  { value: 'debit', label: 'Débito' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'other', label: 'Outros' },
] as const;

export const SHEET_MAP: Record<string, { row: number; type: 'income' | 'expense' }> = {
  salary_liz:          { row: 4,  type: 'income' },
  salary_wesley:       { row: 5,  type: 'income' },
  pension_liz:         { row: 6,  type: 'income' },
  benefits:            { row: 7,  type: 'income' },
  extra_income_wesley: { row: 8,  type: 'income' },
  credit_card:         { row: 12, type: 'expense' },
  macbook:             { row: 13, type: 'expense' },
  rent:                { row: 14, type: 'expense' },
  condo:               { row: 15, type: 'expense' },
  transport:           { row: 16, type: 'expense' },
  electricity:         { row: 17, type: 'expense' },
  phone:               { row: 18, type: 'expense' },
  storage:             { row: 19, type: 'expense' },
  pet:                 { row: 20, type: 'expense' },
  therapy:             { row: 21, type: 'expense' },
  streaming:           { row: 22, type: 'expense' },
};

export const MONTH_TO_COL: Record<number, string> = {
  2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F',
  7: 'G', 8: 'H', 9: 'I', 10: 'J', 11: 'K', 12: 'L',
};

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const getBalanceColor = (balance: number): string => {
  if (balance > 0) return 'text-balance-positive';
  if (balance >= -1000) return 'text-balance-warning';
  return 'text-balance-negative';
};

export const getBalanceBgColor = (balance: number): string => {
  if (balance > 0) return 'bg-balance-positive';
  if (balance >= -1000) return 'bg-balance-warning';
  return 'bg-balance-negative';
};
