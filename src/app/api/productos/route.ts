import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  if (!json || typeof json.name !== 'string') {
    return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
  }
  const product = await prisma.product.create({
    data: {
      name: json.name,
      category: json.category ?? 'Otros',
      unit: json.unit ?? 'u',
      defaultQty: json.defaultQty ?? 1,
      brand: json.brand,
    },
  });
  return NextResponse.json(product, { status: 201 });
}
