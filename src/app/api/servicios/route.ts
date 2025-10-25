import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { serviceSchema } from '@/types/forms';

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const services = await prisma.service.findMany({
    where: { userId: session.user.id },
    include: { bills: { orderBy: { dueDate: 'desc' }, take: 1 } },
  });
  return NextResponse.json(services);
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parseResult = serviceSchema.safeParse(json);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.flatten() }, { status: 400 });
  }

  const data = parseResult.data;
  const service = await prisma.service.create({
    data: {
      userId: session.user.id,
      name: data.name,
      category: data.category,
      provider: data.provider,
      typicalDay: data.typicalDay,
      lastAmount: data.lastAmount,
      currency: data.currency,
    },
  });
  return NextResponse.json(service, { status: 201 });
}
