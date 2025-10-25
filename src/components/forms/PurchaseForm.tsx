'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { purchaseSchema, type PurchaseFormValues, type PurchaseItemFormValues, aiPromptSchema, type AiPromptValues } from '@/types/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export function PurchaseForm({ defaultValues }: { defaultValues?: Partial<PurchaseFormValues> }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      purchasedAt: new Date(),
      currency: 'ARS',
      items: [{ name: '', category: '', quantity: 1, unit: 'u', unitPrice: 0 }],
      ...defaultValues,
    },
  });

  const promptForm = useForm<AiPromptValues>({
    resolver: zodResolver(aiPromptSchema),
    defaultValues: { prompt: '' },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });

  const total = form.watch('items').reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleSubmit = async (values: PurchaseFormValues) => {
    setError(null);
    const response = await fetch('/api/compras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      setError('No se pudo guardar la compra');
      return;
    }
    form.reset();
    router.refresh();
  };

  const handlePrompt = async (values: AiPromptValues) => {
    setError(null);
    const response = await fetch('/api/ai/generate-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      setError('La IA no pudo generar la lista');
      return;
    }
    const data = await response.json();
    form.setValue(
      'items',
      data.suggestion.items.map((item: { name: string; category: string; quantity: number; unit: string; suggestedPrice: number }) => ({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.suggestedPrice ?? 0,
      }))
    );
    promptForm.reset();
    setDialogOpen(false);
  };

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit(handleSubmit)}
    >
      <label className="grid gap-1 text-sm font-medium">
        Comercio
        <Input {...form.register('store')} placeholder="Ej. Supermercado" />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Fecha de compra
        <Input type="date" {...form.register('purchasedAt', { valueAsDate: true })} />
      </label>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline">
            Generar con IA
          </Button>
        </DialogTrigger>
        <DialogContent>
          <form
            className="space-y-4"
            onSubmit={promptForm.handleSubmit(async (values) => {
              await handlePrompt(values);
            })}
          >
            <h2 className="text-lg font-semibold">Describe lo que necesitás</h2>
            <Textarea rows={4} {...promptForm.register('prompt')} />
            {promptForm.formState.errors.prompt && (
              <p className="text-sm text-red-500">{promptForm.formState.errors.prompt.message}</p>
            )}
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit">Generar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Items</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ name: '', category: '', quantity: 1, unit: 'u', unitPrice: 0 })}
          >
            Agregar ítem
          </Button>
        </div>
        {fields.map((field, index) => (
          <div key={field.id} className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-6 md:items-end">
            <Field label="Producto" registerName={`items.${index}.name`} form={form} />
            <Field label="Categoría" registerName={`items.${index}.category`} form={form} />
            <Field label="Cantidad" registerName={`items.${index}.quantity`} form={form} type="number" step="0.1" valueAsNumber />
            <Field label="Unidad" registerName={`items.${index}.unit`} form={form} />
            <Field
              label="Precio unitario"
              registerName={`items.${index}.unitPrice`}
              form={form}
              type="number"
              step="0.01"
              valueAsNumber
            />
            <Button type="button" variant="ghost" onClick={() => remove(index)}>
              Quitar
            </Button>
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <p className="text-sm font-medium">Total estimado: ARS {total.toFixed(2)}</p>
      <Button type="submit">Guardar compra</Button>
    </form>
  );
}

type FieldProps = {
  label: string;
  registerName: `items.${number}.${keyof PurchaseItemFormValues}` | keyof PurchaseFormValues;
  form: ReturnType<typeof useForm<PurchaseFormValues>>;
  type?: string;
  step?: string;
  valueAsNumber?: boolean;
};

function Field({ label, registerName, form, type = 'text', step, valueAsNumber }: FieldProps) {
  return (
    <label className="grid gap-1 text-xs font-medium uppercase text-slate-500">
      {label}
      <Input type={type} step={step} {...form.register(registerName as never, { valueAsNumber })} />
    </label>
  );
}
