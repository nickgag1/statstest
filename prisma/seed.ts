import { PrismaClient, IncomeSource } from '@prisma/client';
import { subMonths } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@local.test' },
    update: {},
    create: {
      email: 'demo@local.test',
      name: 'Demo User',
    },
  });

  await prisma.product.deleteMany();
  const products = await Promise.all(
    [
      { name: 'Arroz largo fino', category: 'Alimentos', unit: 'kg', defaultQty: 1, brand: 'Genérico' },
      { name: 'Fideos secos', category: 'Alimentos', unit: 'kg', defaultQty: 1 },
      { name: 'Harina 000', category: 'Alimentos', unit: 'kg', defaultQty: 1 },
      { name: 'Aceite de girasol', category: 'Alimentos', unit: 'lt', defaultQty: 1 },
      { name: 'Leche entera', category: 'Alimentos', unit: 'lt', defaultQty: 6 },
      { name: 'Pan lactal', category: 'Alimentos', unit: 'u', defaultQty: 2 },
      { name: 'Papel higiénico', category: 'Higiene', unit: 'pack', defaultQty: 1 },
      { name: 'Detergente', category: 'Limpieza', unit: 'lt', defaultQty: 1 },
      { name: 'Shampoo', category: 'Higiene', unit: 'u', defaultQty: 1 },
      { name: 'Jabón de tocador', category: 'Higiene', unit: 'pack', defaultQty: 1 },
      { name: 'Yerba mate', category: 'Alimentos', unit: 'kg', defaultQty: 1 },
      { name: 'Azúcar', category: 'Alimentos', unit: 'kg', defaultQty: 1 },
    ].map((product) =>
      prisma.product.create({
        data: product,
      })
    )
  );

  await prisma.consumptionAverage.deleteMany();
  await prisma.consumptionAverage.createMany({
    data: [
      { category: 'Alimentos', monthlyQty: 35, unit: 'kg', source: 'Estimado INDEC/CBA 2024-2025' },
      { category: 'Limpieza', monthlyQty: 2.5, unit: 'lt', source: 'Estimado INDEC/CBA 2024-2025' },
      { category: 'Higiene', monthlyQty: 10, unit: 'u', source: 'Estimado INDEC/CBA 2024-2025' },
      { category: 'Infantil', monthlyQty: 8, unit: 'u', source: 'Estimado INDEC/CBA 2024-2025' },
      { category: 'Otros', monthlyQty: 5, unit: 'u', source: 'Estimado INDEC/CBA 2024-2025' },
    ],
  });

  const now = new Date();
  await prisma.income.deleteMany({ where: { userId: demoUser.id } });
  const incomePromises = [1, 2, 3].map((monthOffset) => {
    const date = subMonths(now, monthOffset - 1);
    return prisma.income.create({
      data: {
        userId: demoUser.id,
        source: IncomeSource.SALARIO,
        amount: 800000,
        currency: 'ARS',
        receivedAt: new Date(date.getFullYear(), date.getMonth(), 5),
        notes: 'Ingreso mensual',
      },
    });
  });
  await Promise.all(incomePromises);

  await prisma.service.deleteMany({ where: { userId: demoUser.id } });
  const services = await Promise.all(
    [
      { userId: demoUser.id, name: 'Luz', category: 'Luz', provider: 'Edesur', typicalDay: 10, lastAmount: 35000 },
      { userId: demoUser.id, name: 'Gas', category: 'Gas', provider: 'Metrogas', typicalDay: 15, lastAmount: 25000 },
      { userId: demoUser.id, name: 'Agua', category: 'Agua', provider: 'AySA', typicalDay: 20, lastAmount: 18000 },
      { userId: demoUser.id, name: 'Internet', category: 'Internet', provider: 'Fibertel', typicalDay: 12, lastAmount: 22000 },
      { userId: demoUser.id, name: 'Alquiler', category: 'Alquiler', provider: 'Particular', typicalDay: 1, lastAmount: 300000 },
    ].map((service) => prisma.service.create({ data: service }))
  );

  await Promise.all(
    services.map((service) =>
      prisma.serviceBill.create({
        data: {
          serviceId: service.id,
          period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
          dueDate: new Date(now.getFullYear(), now.getMonth(), service.typicalDay ?? 10),
          amount: service.lastAmount ?? 0,
          paid: service.category === 'Alquiler',
        },
      })
    )
  );

  await prisma.purchaseItem.deleteMany({ where: { purchase: { userId: demoUser.id } } });
  await prisma.purchase.deleteMany({ where: { userId: demoUser.id } });

  const monthOffsets = [0, 1, 2];
  for (const offset of monthOffsets) {
    const purchaseDate = subMonths(now, offset);
    const purchase = await prisma.purchase.create({
      data: {
        userId: demoUser.id,
        store: offset === 0 ? 'Mercado Central' : 'Supermercado Barrio',
        total: 120000 + offset * 5000,
        currency: 'ARS',
        purchasedAt: new Date(purchaseDate.getFullYear(), purchaseDate.getMonth(), 8),
      },
    });

    const items = [
      { productName: 'Arroz largo fino', quantity: 2, unit: 'kg', unitPrice: 2500, category: 'Alimentos' },
      { productName: 'Aceite de girasol', quantity: 1, unit: 'lt', unitPrice: 4500, category: 'Alimentos' },
      { productName: 'Leche entera', quantity: 6, unit: 'lt', unitPrice: 1200, category: 'Alimentos' },
      { productName: 'Detergente', quantity: 1, unit: 'lt', unitPrice: 3200, category: 'Limpieza' },
      { productName: 'Shampoo', quantity: 1, unit: 'u', unitPrice: 3800, category: 'Higiene' },
    ];

    for (const item of items) {
      const product = products.find((p) => p.name === item.productName);
      await prisma.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productId: product?.id,
          name: item.productName,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
        },
      });
    }
  }

  await prisma.shoppingList.deleteMany({ where: { userId: demoUser.id } });
  await prisma.shoppingList.create({
    data: {
      userId: demoUser.id,
      title: 'Lista mensual inicial',
      fromPrompt: 'Lista generada para demo',
      items: {
        create: [
          {
            name: 'Yerba mate',
            category: 'Alimentos',
            quantity: 1,
            unit: 'kg',
          },
          {
            name: 'Papel higiénico',
            category: 'Higiene',
            quantity: 1,
            unit: 'pack',
          },
        ],
      },
    },
  });

  console.log('Seed completed successfully');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
