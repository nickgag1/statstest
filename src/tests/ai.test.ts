import { describe, expect, it, vi } from 'vitest';
import { generateListWithAI } from '@/lib/ai';

vi.mock('@/lib/prisma', () => {
  const products = [
    { id: '1', name: 'Arroz largo fino', category: 'Alimentos', unit: 'kg', defaultQty: 1 },
    { id: '2', name: 'Shampoo', category: 'Higiene', unit: 'u', defaultQty: 1 },
  ];
  return {
    prisma: {
      product: { findMany: vi.fn(async () => products) },
      consumptionAverage: { findMany: vi.fn(async () => []) },
      purchaseItem: { findMany: vi.fn(async () => []) },
    },
  };
});

describe('generateListWithAI', () => {
  it('usa mock determinístico cuando no hay API key', async () => {
    delete process.env.OPENAI_API_KEY;
    const suggestion = await generateListWithAI({ userId: 'user-1', prompt: 'Necesito arroz y shampoo' });
    expect(suggestion.items.length).toBeGreaterThan(0);
    expect(suggestion.items[0]).toHaveProperty('name');
  });
});
