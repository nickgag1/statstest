import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { fetchConsumptionComparisons } from '@/lib/stats';

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const comparisons = await fetchConsumptionComparisons(session.user.id);
  return NextResponse.json(comparisons);
}
