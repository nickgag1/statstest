import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { incomeSchema } from '@/types/forms';

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const incomes = await prisma.income.findMany({
    where: { userId: session.user.id },
    orderBy: { receivedAt: 'desc' },
  });
  return NextResponse.json(incomes);
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parseResult = incomeSchema.safeParse(json);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.flatten() }, { status: 400 });
  }

  const data = parseResult.data;
  const income = await prisma.income.create({
    data: {
      userId: session.user.id,
      source: data.source,
      amount: data.amount,
      currency: data.currency,
      receivedAt: data.receivedAt,
      notes: data.notes,
    },
  });

  return NextResponse.json(income, { status: 201 });
}
