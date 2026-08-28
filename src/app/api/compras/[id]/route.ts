import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { purchaseSchema } from '@/types/forms';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const purchase = await prisma.purchase.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  if (!purchase || purchase.userId !== session.user.id) {
    return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 });
  }
  return NextResponse.json(purchase);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const json = await request.json().catch(() => null);
  const parseResult = purchaseSchema.partial().safeParse(json);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.flatten() }, { status: 400 });
  }
  const data = parseResult.data;
  const existing = await prisma.purchase.findUnique({ where: { id: params.id }, include: { items: true } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 });
  }

  const purchase = await prisma.purchase.update({
    where: { id: params.id },
    data: {
      store: data.store,
      purchasedAt: data.purchasedAt,
      currency: data.currency,
      ...(data.items
        ? {
            total: data.items.reduce((sum, item) => sum + (item.quantity ?? 0) * (item.unitPrice ?? 0), 0),
            items: {
              deleteMany: {},
              create: data.items.map((item) => ({
                productId: item.productId,
                name: item.name!,
                category: item.category!,
                quantity: item.quantity!,
                unit: item.unit!,
                unitPrice: item.unitPrice!,
              })),
            },
          }
        : {}),
    },
    include: { items: true },
  });
  return NextResponse.json(purchase);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const existing = await prisma.purchase.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 });
  }
  await prisma.purchase.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
