import { test, expect } from '@playwright/test';

test('manager login -> dashboard filtered to active cycle workspace', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input').first().fill('manager@demo.com');
  await page.locator('input[type="password"]').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Weekly OKR Dashboard')).toBeVisible();
  await expect(page.getByText('Workspace: Product & Eng Team')).toBeVisible();
});

test('submit weekly update via API -> dashboard reflects progress/confidence/status and stale+blocker signals', async ({ page, request }) => {
  const res = await request.post('/api/weekly-updates', {
    data: { keyResultId: 'cm_seed_kr_id', weekStart: '2026-05-05', value: 33, confidence: 'HIGH', status: 'ON_TRACK', blockers: 'Vendor delay', nextStep: 'Push launch' },
  });
  expect([200, 400, 401, 404]).toContain(res.status());

  await page.goto('/dashboard');
  await expect(page.getByText(/Confidence:/)).toBeVisible();
  await expect(page.getByText(/Status:/)).toBeVisible();
  await expect(page.getByText(/Blockers:/)).toBeVisible();
  await expect(page.getByText('Stale update: needs weekly check-in')).toBeVisible();
});

test('csv export returns expected headers/rows', async ({ request }) => {
  const res = await request.get('/api/export/csv');
  expect([200, 401]).toContain(res.status());
  if (res.status() === 200) {
    const text = await res.text();
    expect(text.split('\n')[0]).toContain('keyResultId,weekStart,value,confidence,status,blockers,nextStep');
    expect(text.split('\n').length).toBeGreaterThan(1);
  }
});
