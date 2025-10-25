export type ConsumptionAverageEntry = {
  category: string;
  monthlyQty: number;
  unit: string;
};

export const consumoPromedios: ConsumptionAverageEntry[] = [
  { category: 'Alimentos', monthlyQty: 35, unit: 'kg' },
  { category: 'Limpieza', monthlyQty: 2.5, unit: 'lt' },
  { category: 'Higiene', monthlyQty: 10, unit: 'u' },
  { category: 'Infantil', monthlyQty: 8, unit: 'u' },
  { category: 'Otros', monthlyQty: 5, unit: 'u' },
];

export const consumoPromediosMap = new Map(
  consumoPromedios.map((entry) => [entry.category, entry])
);
