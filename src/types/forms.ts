import { z } from 'zod';

export const incomeSchema = z.object({
  id: z.string().optional(),
  source: z.enum(['SALARIO', 'FREELANCE', 'TRANSFERENCIA', 'REINTEGRO', 'OTROS']),
  amount: z.coerce.number().positive('Ingresá un monto válido'),
  currency: z.string().default('ARS'),
  receivedAt: z.coerce.date(),
  notes: z.string().optional(),
});

export type IncomeFormValues = z.infer<typeof incomeSchema>;

export const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Nombre requerido'),
  category: z.string().min(2, 'Categoría requerida'),
  provider: z.string().optional(),
  typicalDay: z.coerce.number().min(1).max(31).optional(),
  lastAmount: z.coerce.number().nonnegative().optional(),
  currency: z.string().default('ARS'),
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;

export const purchaseItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().optional(),
  name: z.string().min(2),
  category: z.string().min(2),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1),
  unitPrice: z.coerce.number().nonnegative(),
});

export const purchaseSchema = z.object({
  id: z.string().optional(),
  store: z.string().optional(),
  purchasedAt: z.coerce.date(),
  currency: z.string().default('ARS'),
  items: z.array(purchaseItemSchema).min(1, 'Agregá al menos un item'),
});

export type PurchaseFormValues = z.infer<typeof purchaseSchema>;
export type PurchaseItemFormValues = z.infer<typeof purchaseItemSchema>;

export const aiPromptSchema = z.object({
  prompt: z.string().min(5, 'Contanos qué necesitás'),
});

export type AiPromptValues = z.infer<typeof aiPromptSchema>;
