import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const json = await request.json().catch(() => null);
  if (!json) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }
  const product = await prisma.product.update({
    where: { id: params.id },
    data: json,
  });
  return NextResponse.json(product);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
