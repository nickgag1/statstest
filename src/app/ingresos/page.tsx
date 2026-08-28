import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IncomeForm } from '@/components/forms/IncomeForm';
import { IncomeTable } from '@/components/tables/IncomeTable';

export default async function IngresosPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const incomes = await prisma.income.findMany({
    where: { userId: session.user.id },
    orderBy: { receivedAt: 'desc' },
  });

  return (
    <div className="mx-auto grid max-w-4xl gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Cargar ingreso</CardTitle>
        </CardHeader>
        <CardContent>
          <IncomeForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          <IncomeTable incomes={incomes} />
        </CardContent>
      </Card>
    </div>
  );
}
