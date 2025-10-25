'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({
  email: z.string().email('Ingresá un email válido'),
});

type FormValues = z.infer<typeof schema>;

export default function SignInPage() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent'>('idle');

  const onSubmit = async (values: FormValues) => {
    setStatus('loading');
    await signIn('email', { email: values.email, redirect: false });
    setStatus('sent');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">Accedé a Triskelium Life</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Email
              <Input type="email" placeholder="vos@ejemplo.com" {...form.register('email')} />
            </label>
            {form.formState.errors.email && (
              <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
            )}
            <Button type="submit" disabled={status === 'loading'} className="w-full">
              {status === 'loading' ? 'Enviando enlace...' : 'Enviar enlace mágico'}
            </Button>
            {status === 'sent' && (
              <p className="text-sm text-green-600">Revisá tu bandeja para el enlace mágico.</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
