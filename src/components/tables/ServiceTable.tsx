import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type Service, type ServiceBill } from '@prisma/client';

type ServiceWithBills = Service & { bills: ServiceBill[] };

export function ServiceTable({ services }: { services: ServiceWithBills[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Servicio</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead>Proveedor</TableHead>
          <TableHead>Último monto</TableHead>
          <TableHead>Próximo vencimiento</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {services.map((service) => {
          const bill = service.bills[0];
          return (
            <TableRow key={service.id}>
              <TableCell>{service.name}</TableCell>
              <TableCell>{service.category}</TableCell>
              <TableCell>{service.provider ?? '—'}</TableCell>
              <TableCell>{service.lastAmount ? `ARS ${Number(service.lastAmount).toFixed(2)}` : '—'}</TableCell>
              <TableCell>
                {bill
                  ? `${format(bill.dueDate, 'dd MMM', { locale: es })} (${bill.paid ? 'Pagado' : 'Pendiente'})`
                  : '—'}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
