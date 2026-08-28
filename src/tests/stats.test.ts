import { describe, expect, it, vi } from 'vitest';
import { computeUserMonthlyConsumption } from '@/lib/stats';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    purchaseItem: {
      groupBy: vi.fn(async () => [
        { category: 'Alimentos', unit: 'kg', _sum: { quantity: 9 } },
        { category: 'Higiene', unit: 'u', _sum: { quantity: 6 } },
      ]),
    },
  },
}));

vi.mock('@/lib/argentina/consumo_promedios', () => ({
  consumoPromediosMap: new Map([
    ['Alimentos', { monthlyQty: 12, unit: 'kg' }],
    ['Higiene', { monthlyQty: 10, unit: 'u' }],
  ]),
}));

describe('computeUserMonthlyConsumption', () => {
  it('calcula delta porcentual', async () => {
    const result = await computeUserMonthlyConsumption('user');
    const alimentos = result.find((entry) => entry.category === 'Alimentos');
    expect(alimentos?.deltaPct).toBeCloseTo(-75);
  });
});
