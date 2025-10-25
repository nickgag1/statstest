import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { purchaseSchema } from '@/types/forms';

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const purchases = await prisma.purchase.findMany({
    where: { userId: session.user.id },
    include: { items: true },
    orderBy: { purchasedAt: 'desc' },
  });
  return NextResponse.json(purchases);
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parseResult = purchaseSchema.safeParse(json);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.flatten() }, { status: 400 });
  }

  const data = parseResult.data;
  const total = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const purchase = await prisma.purchase.create({
    data: {
      userId: session.user.id,
      store: data.store,
      currency: data.currency,
      total,
      purchasedAt: data.purchasedAt,
      items: {
        create: data.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
        })),
      },
    },
    include: { items: true },
  });
  return NextResponse.json(purchase, { status: 201 });
}
