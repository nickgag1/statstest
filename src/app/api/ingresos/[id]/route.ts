import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { incomeSchema } from '@/types/forms';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const income = await prisma.income.findUnique({
    where: { id: params.id },
  });
  if (!income || income.userId !== session.user.id) {
    return NextResponse.json({ error: 'Ingreso no encontrado' }, { status: 404 });
  }
  return NextResponse.json(income);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parseResult = incomeSchema.partial().safeParse(json);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.income.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Ingreso no encontrado' }, { status: 404 });
  }

  const income = await prisma.income.update({
    where: { id: params.id },
    data: parseResult.data,
  });
  return NextResponse.json(income);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const existing = await prisma.income.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Ingreso no encontrado' }, { status: 404 });
  }

  await prisma.income.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
