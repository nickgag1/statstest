# Triskelium Life

Aplicación full-stack para gestionar ingresos, servicios y compras en Argentina con asistencia de IA.

## Requisitos

- Node.js 20+
- pnpm 8+

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar según ambiente.

```
DATABASE_PROVIDER="sqlite"
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="changeme"
NEXTAUTH_URL="http://localhost:3000"
EMAIL_SERVER="" # usar stream de nodemailer en desarrollo
EMAIL_FROM="no-reply@local.test"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
OPENAI_API_KEY="" # si queda vacío se usa mock determinístico
```

Para producción con Postgres actualizar:

```
DATABASE_PROVIDER="postgresql"
DATABASE_URL="postgresql://usuario:password@host:puerto/base"
```

## Instalación y uso

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:dev
pnpm dev
```

Visitar [http://localhost:3000](http://localhost:3000). Iniciar sesión con `demo@local.test` usando magic link (se loguea en consola en dev).

## Scripts

- `pnpm dev`: servidor Next.js
- `pnpm build`: build de producción
- `pnpm start`: servidor producción
- `pnpm prisma:dev`: aplica migraciones iniciales y seed
- `pnpm test`: ejecuta Vitest
- `pnpm e2e`: corre Playwright
- `pnpm lint`: ESLint

## IA y dataset

Si `OPENAI_API_KEY` no está definido, el endpoint `/api/ai/generate-list` usa heurísticas con historial de compras y consumos promedio locales.

Los promedios de consumo (`src/lib/argentina/consumo_promedios.ts`) son estimaciones referenciales inspiradas en la canasta básica argentina 2024-2025 para fines demostrativos.

## Autenticación

NextAuth con magic link vía email (Nodemailer stream en desarrollo) y soporte opcional para Google OAuth al definir `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.

## Tests

```bash
pnpm test
pnpm e2e
```

El test E2E está marcado con `test.skip` hasta contar con infraestructura de correo real.

## Roadmap

- Gestión completa de ServiceBill (pagos y recordatorios)
- Reportes personalizados exportables
- Integración con APIs de precios para sugerencias dinámicas

## Limitaciones

- Seed orientado a demostración, no pretende reflejar costos reales.
- Magic link requiere inspeccionar consola en desarrollo.
- Gráfico usa datos agregados cada 3 meses; puede ajustarse con series temporales.
