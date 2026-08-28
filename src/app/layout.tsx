import type { Metadata } from 'next';
import './globals.css';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getAuthSession } from '@/lib/auth';
import { SignOutButton } from '@/components/SignOutButton';

export const metadata: Metadata = {
  title: 'Triskelium Life',
  description: 'Gestor personal argentino con IA',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getAuthSession();

  return (
    <html lang="es">
      <body className={cn('min-h-screen bg-slate-50 text-slate-900')}>
        <div className="min-h-screen">
          {session?.user ? (
            <header className="border-b border-slate-200 bg-white">
              <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
                  <Link href="/dashboard" className="hover:text-slate-900">
                    Dashboard
                  </Link>
                  <Link href="/ingresos" className="hover:text-slate-900">
                    Ingresos
                  </Link>
                  <Link href="/servicios" className="hover:text-slate-900">
                    Servicios
                  </Link>
                  <Link href="/compras" className="hover:text-slate-900">
                    Compras
                  </Link>
                </nav>
                <SignOutButton />
              </div>
            </header>
          ) : null}
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
