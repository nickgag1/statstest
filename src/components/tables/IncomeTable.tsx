import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type Income } from '@prisma/client';

export function IncomeTable({ incomes }: { incomes: Income[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fuente</TableHead>
          <TableHead>Monto</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Notas</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {incomes.map((income) => (
          <TableRow key={income.id}>
            <TableCell>{income.source}</TableCell>
            <TableCell>ARS {Number(income.amount).toFixed(2)}</TableCell>
            <TableCell>{format(income.receivedAt, 'dd MMM yyyy', { locale: es })}</TableCell>
            <TableCell>{income.notes ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
