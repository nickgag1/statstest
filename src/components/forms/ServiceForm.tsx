'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { serviceSchema, type ServiceFormValues } from '@/types/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ServiceForm({ defaultValues }: { defaultValues?: Partial<ServiceFormValues> }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      currency: 'ARS',
      name: '',
      category: '',
      ...defaultValues,
    },
  });

  const onSubmit = async (values: ServiceFormValues) => {
    setError(null);
    const response = await fetch('/api/servicios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      setError('No se pudo guardar el servicio');
      return;
    }
    form.reset();
    router.refresh();
  };

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="grid gap-1 text-sm font-medium">
        Nombre
        <Input {...form.register('name')} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Categoría
        <Input {...form.register('category')} placeholder="Luz, Gas, Internet..." />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Proveedor
        <Input {...form.register('provider')} placeholder="Opcional" />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Día típico de vencimiento
        <Input
          type="number"
          {...form.register('typicalDay', {
            setValueAs: (value) => (value === '' ? undefined : Number(value)),
          })}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Último monto
        <Input
          type="number"
          step="0.01"
          {...form.register('lastAmount', {
            setValueAs: (value) => (value === '' ? undefined : Number(value)),
          })}
        />
      </label>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit">Guardar servicio</Button>
    </form>
  );
}
