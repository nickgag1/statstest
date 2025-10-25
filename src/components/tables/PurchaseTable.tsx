import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type Purchase, type PurchaseItem } from '@prisma/client';

type PurchaseWithItems = Purchase & { items: PurchaseItem[] };

export function PurchaseTable({ purchases }: { purchases: PurchaseWithItems[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Comercio</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Items</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {purchases.map((purchase) => (
          <TableRow key={purchase.id}>
            <TableCell>{format(purchase.purchasedAt, 'dd MMM yyyy', { locale: es })}</TableCell>
            <TableCell>{purchase.store ?? '—'}</TableCell>
            <TableCell>ARS {Number(purchase.total).toFixed(2)}</TableCell>
            <TableCell>
              <ul className="space-y-1">
                {purchase.items.map((item) => (
                  <li key={item.id} className="text-xs text-slate-600">
                    {item.name} ({item.quantity} {item.unit})
                  </li>
                ))}
              </ul>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
