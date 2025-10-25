import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PurchaseForm } from '@/components/forms/PurchaseForm';

export default async function NuevaCompraPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Nueva compra</CardTitle>
        </CardHeader>
        <CardContent>
          <PurchaseForm />
        </CardContent>
      </Card>
    </div>
  );
}
