import { describe, expect, it } from 'vitest';
import { incomeSchema, aiPromptSchema } from '@/types/forms';

describe('incomeSchema', () => {
  it('valida payload correcto', () => {
    const result = incomeSchema.safeParse({
      source: 'SALARIO',
      amount: '1200',
      currency: 'ARS',
      receivedAt: '2024-01-01',
    });
    expect(result.success).toBe(true);
  });

  it('falla con email inválido', () => {
    const result = incomeSchema.safeParse({ source: 'SALARIO', amount: '-1', receivedAt: '2024-01-01' });
    expect(result.success).toBe(false);
  });
});

describe('aiPromptSchema', () => {
  it('requiere prompt con longitud mínima', () => {
    const result = aiPromptSchema.safeParse({ prompt: 'hola' });
    expect(result.success).toBe(false);
  });
});
