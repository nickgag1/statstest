'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { incomeSchema, type IncomeFormValues } from '@/types/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function IncomeForm({ defaultValues }: { defaultValues?: Partial<IncomeFormValues> }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      currency: 'ARS',
      receivedAt: new Date(),
      source: 'SALARIO',
      amount: 0,
      ...defaultValues,
    },
  });

  const onSubmit = async (values: IncomeFormValues) => {
    setError(null);
    const response = await fetch('/api/ingresos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      setError('No se pudo guardar el ingreso');
      return;
    }
    form.reset();
    router.refresh();
  };

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="grid gap-1 text-sm font-medium">
        Origen
        <select className="h-10 rounded-md border border-slate-200 px-3" {...form.register('source')}>
          <option value="SALARIO">Salario</option>
          <option value="FREELANCE">Freelance</option>
          <option value="TRANSFERENCIA">Transferencia</option>
          <option value="REINTEGRO">Reintegro</option>
          <option value="OTROS">Otros</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Monto
        <Input type="number" step="0.01" {...form.register('amount', { valueAsNumber: true })} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Fecha de cobro
        <Input type="date" {...form.register('receivedAt', { valueAsDate: true })} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Notas
        <Input {...form.register('notes')} placeholder="Opcional" />
      </label>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit">Guardar ingreso</Button>
    </form>
  );
}
