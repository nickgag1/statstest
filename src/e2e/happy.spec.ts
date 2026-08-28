import { test, expect } from '@playwright/test';

test('flujo feliz de onboarding', async ({ page }) => {
  test.skip(true, 'El flujo completo requiere backend en ejecución con email mágico.');
  await page.goto('/sign-in');
  await expect(page).toHaveTitle(/Triskelium Life/);
});
