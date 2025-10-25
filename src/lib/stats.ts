import { prisma } from '@/lib/prisma';
import { consumoPromediosMap } from '@/lib/argentina/consumo_promedios';

export type ConsumptionComparison = {
  category: string;
  userMonthlyQty: number;
  avgMonthlyQty: number;
  unit: string;
  deltaPct: number;
};

export async function computeUserMonthlyConsumption(userId: string): Promise<ConsumptionComparison[]> {
  const items = await prisma.purchaseItem.groupBy({
    by: ['category', 'unit'],
    where: { purchase: { userId } },
    _sum: { quantity: true },
  });

  return items.map((item) => {
    const average = consumoPromediosMap.get(item.category);
    const avgMonthlyQty = average?.monthlyQty ?? 0;
    const unit = item.unit ?? average?.unit ?? 'u';
    const userMonthlyQty = Number(item._sum.quantity ?? 0) / 3;
    const deltaPct = avgMonthlyQty === 0 ? 0 : ((userMonthlyQty - avgMonthlyQty) / avgMonthlyQty) * 100;
    return {
      category: item.category,
      userMonthlyQty: Number(userMonthlyQty.toFixed(2)),
      avgMonthlyQty,
      unit,
      deltaPct: Number(deltaPct.toFixed(2)),
    };
  });
}

export async function fetchConsumptionComparisons(userId: string): Promise<ConsumptionComparison[]> {
  const consumption = await computeUserMonthlyConsumption(userId);
  const categories = new Set([...consumoPromediosMap.keys(), ...consumption.map((entry) => entry.category)]);

  return Array.from(categories).map((category) => {
    const base = consumption.find((entry) => entry.category === category);
    const average = consumoPromediosMap.get(category);
    const avgMonthlyQty = average?.monthlyQty ?? 0;
    const unit = average?.unit ?? base?.unit ?? 'u';
    const userMonthlyQty = base?.userMonthlyQty ?? 0;
    const deltaPct = avgMonthlyQty === 0 ? 0 : ((userMonthlyQty - avgMonthlyQty) / avgMonthlyQty) * 100;
    return {
      category,
      userMonthlyQty: Number(userMonthlyQty.toFixed(2)),
      avgMonthlyQty,
      unit,
      deltaPct: Number(deltaPct.toFixed(2)),
    };
  });
}
