import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { serviceSchema } from '@/types/forms';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const service = await prisma.service.findUnique({
    where: { id: params.id },
    include: { bills: { orderBy: { dueDate: 'desc' } } },
  });
  if (!service || service.userId !== session.user.id) {
    return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
  }
  return NextResponse.json(service);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parseResult = serviceSchema.partial().safeParse(json);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.service.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
  }

  const service = await prisma.service.update({
    where: { id: params.id },
    data: parseResult.data,
  });
  return NextResponse.json(service);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const existing = await prisma.service.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
  }

  await prisma.service.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
