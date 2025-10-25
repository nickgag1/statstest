import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

export type ShoppingListSuggestion = {
  title: string;
  items: {
    name: string;
    category: string;
    quantity: number;
    unit: string;
    suggestedPrice: number;
  }[];
  explanations: string[];
};

const SYSTEM_PROMPT = `Sos un asistente para Argentina que convierte pedidos en lenguaje natural en listas de compras. Devolvés JSON válido y estricto con title, items[], explanations[]. Cada item tiene name, category (Alimentos/Limpieza/Higiene/Infantil/Otros), quantity (número), unit (kg/lt/u/pack), suggestedPrice (número ARS). Usá hábitos previos del usuario (historial de purchases) y, si falta info, compará con promedios ConsumptionAverage. Ajustá cantidades a familias pequeñas (por defecto 2 adultos + 1 menor). No inventes marcas. Nunca devuelvas texto fuera del JSON.`;

export async function generateListWithAI({
  userId,
  prompt,
}: {
  userId: string;
  prompt: string;
}): Promise<ShoppingListSuggestion> {
  if (!prompt.trim()) {
    throw new Error('Prompt vacío');
  }

  if (!process.env.OPENAI_API_KEY) {
    return generateMockList({ userId, prompt });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    input: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'shopping_list',
        schema: {
          type: 'object',
          required: ['title', 'items', 'explanations'],
          properties: {
            title: { type: 'string' },
            explanations: {
              type: 'array',
              items: { type: 'string' },
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'category', 'quantity', 'unit', 'suggestedPrice'],
                properties: {
                  name: { type: 'string' },
                  category: { type: 'string' },
                  quantity: { type: 'number' },
                  unit: { type: 'string' },
                  suggestedPrice: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  });

  const text = Array.isArray(response.output_text) ? response.output_text.join('') : (response.output_text as string | undefined);
  if (!text) {
    const content = response.output?.[0];
    if (!content || content.type !== 'output_text') {
      throw new Error('Respuesta inesperada de OpenAI');
    }
    return JSON.parse(content.text) as ShoppingListSuggestion;
  }

  return JSON.parse(text) as ShoppingListSuggestion;
}

async function generateMockList({
  userId,
  prompt,
}: {
  userId: string;
  prompt: string;
}): Promise<ShoppingListSuggestion> {
  const lowerPrompt = prompt.toLowerCase();
  const products = await prisma.product.findMany();
  const averages = await prisma.consumptionAverage.findMany();
  const lastPurchases = await prisma.purchaseItem.findMany({
    where: { purchase: { userId } },
    orderBy: { purchase: { purchasedAt: 'desc' } },
    take: 50,
  });

  const suggestions = products.filter((product) => {
    return lowerPrompt.includes(product.name.split(' ')[0].toLowerCase());
  });

  const fallbackCategories = new Map(
    averages.map((avg) => [avg.category, { qty: avg.monthlyQty / 4, unit: avg.unit }])
  );

  const items = suggestions.length ? suggestions : products.slice(0, 5);

  const listItems = items.map((product) => {
    const recent = lastPurchases.find((item) => item.productId === product.id);
    const fallback = fallbackCategories.get(product.category);
    const quantity = recent?.quantity ?? fallback?.qty ?? product.defaultQty ?? 1;
    const unit = product.unit ?? fallback?.unit ?? 'u';
    return {
      name: product.name,
      category: product.category,
      quantity,
      unit,
      suggestedPrice: 0,
    };
  });

  const explanations = listItems.map((item) => {
    const reason = lowerPrompt.includes(item.name.toLowerCase())
      ? 'mención directa en el prompt'
      : 'basado en hábitos y promedios locales';
    return `Se agregó ${item.name}: ${reason}.`;
  });

  return {
    title: 'Lista sugerida',
    items: listItems,
    explanations,
  };
}
