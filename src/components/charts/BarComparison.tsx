'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type BarComparisonDatum = {
  category: string;
  userMonthlyQty: number;
  avgMonthlyQty: number;
};

export function BarComparison({ data }: { data: BarComparisonDatum[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip formatter={(value) => `${value as number} unidades`} />
          <Bar dataKey="avgMonthlyQty" fill="#94a3b8" name="Promedio AR" />
          <Bar dataKey="userMonthlyQty" fill="#0f172a" name="Tu consumo" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
