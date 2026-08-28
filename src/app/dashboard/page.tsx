import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarComparison } from '@/components/charts/BarComparison';
import { fetchConsumptionComparisons } from '@/lib/stats';
import { differenceInMonths, isSameMonth } from 'date-fns';

export default async function DashboardPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const [incomes, services, purchases, comparisons] = await Promise.all([
    prisma.income.findMany({
      where: { userId: session.user.id },
      orderBy: { receivedAt: 'desc' },
    }),
    prisma.service.findMany({
      where: { userId: session.user.id },
      include: { bills: { orderBy: { dueDate: 'asc' }, take: 1 } },
    }),
    prisma.purchase.findMany({
      where: { userId: session.user.id },
      include: { items: true },
      orderBy: { purchasedAt: 'desc' },
    }),
    fetchConsumptionComparisons(session.user.id),
  ]);

  const now = new Date();
  const monthIncomes = incomes.filter((income) => isSameMonth(income.receivedAt, now));
  const totalMonthIncome = monthIncomes.reduce((sum, income) => sum + Number(income.amount), 0);
  const pastThreeMonths = incomes.filter((income) => differenceInMonths(now, income.receivedAt) < 3);
  const averageThreeMonths = pastThreeMonths.length
    ? pastThreeMonths.reduce((sum, income) => sum + Number(income.amount), 0) / 3
    : 0;

  const upcomingBills = services
    .map((service) => ({ service, bill: service.bills[0] }))
    .filter((entry) => entry.bill)
    .slice(0, 5);

  return (
    <div className="mx-auto grid max-w-5xl gap-6 p-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Ingresos del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">ARS {totalMonthIncome.toFixed(2)}</p>
            <p className="text-sm text-slate-500">Promedio últimos 3 meses: ARS {averageThreeMonths.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Consumo vs promedio AR</CardTitle>
          </CardHeader>
          <CardContent>
            <BarComparison data={comparisons.map(({ category, userMonthlyQty, avgMonthlyQty }) => ({ category, userMonthlyQty, avgMonthlyQty }))} />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Próximos vencimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {upcomingBills.map(({ service, bill }) => (
              <li key={`${service.id}-${bill?.id}`} className="flex justify-between rounded-lg border border-slate-200 p-3">
                <span>
                  {service.name} — {bill?.paid ? 'Pagado' : 'Pendiente'}
                </span>
                <span>{bill?.dueDate.toLocaleDateString('es-AR')}</span>
              </li>
            ))}
            {upcomingBills.length === 0 && <p>No hay vencimientos registrados.</p>}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Últimas compras</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {purchases.slice(0, 5).map((purchase) => (
              <li key={purchase.id} className="flex justify-between rounded-lg border border-slate-200 p-3">
                <span>{purchase.store ?? 'Sin comercio'}</span>
                <span>
                  {purchase.purchasedAt.toLocaleDateString('es-AR')} · ARS {Number(purchase.total).toFixed(2)}
                </span>
              </li>
            ))}
            {purchases.length === 0 && <p>Aún no cargaste compras.</p>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
