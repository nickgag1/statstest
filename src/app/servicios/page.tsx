import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ServiceForm } from '@/components/forms/ServiceForm';
import { ServiceTable } from '@/components/tables/ServiceTable';

export default async function ServiciosPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const services = await prisma.service.findMany({
    where: { userId: session.user.id },
    include: { bills: { orderBy: { dueDate: 'desc' } } },
  });

  return (
    <div className="mx-auto grid max-w-4xl gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Agregar servicio</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Servicios registrados</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceTable services={services} />
        </CardContent>
      </Card>
    </div>
  );
}
