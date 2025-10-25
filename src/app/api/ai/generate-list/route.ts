import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { generateListWithAI } from '@/lib/ai';
import { prisma } from '@/lib/prisma';

const bodySchema = z.object({ prompt: z.string().min(5) });

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parseResult = bodySchema.safeParse(json);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.flatten() }, { status: 400 });
  }

  const { prompt } = parseResult.data;
  const suggestion = await generateListWithAI({ userId: session.user.id, prompt });

  const list = await prisma.shoppingList.create({
    data: {
      userId: session.user.id,
      title: suggestion.title,
      fromPrompt: prompt,
      items: {
        create: suggestion.items.map((item) => ({
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          suggestedPrice: item.suggestedPrice,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json({ suggestion, list }, { status: 201 });
}
