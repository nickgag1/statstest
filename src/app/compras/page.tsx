import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PurchaseTable } from '@/components/tables/PurchaseTable';

export default async function ComprasPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const purchases = await prisma.purchase.findMany({
    where: { userId: session.user.id },
    include: { items: true },
    orderBy: { purchasedAt: 'desc' },
  });

  return (
    <div className="mx-auto grid max-w-5xl gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Compras</h1>
        <Button asChild>
          <Link href="/compras/nueva">Nueva compra</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          <PurchaseTable purchases={purchases} />
        </CardContent>
      </Card>
    </div>
  );
}
