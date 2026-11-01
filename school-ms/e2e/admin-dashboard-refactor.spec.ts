import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard Simplification & Subject Statistics', () => {

  test('Admin dashboard displays simplified header, KPIs, live subject statistics, and no timetable controls', async ({ page }) => {
    // 1. Sign in as Admin
    await page.goto('/login');
    await page.locator('input[type="text"]').first().fill('admin@school.com');
    await page.locator('input[type="password"]').fill('admin@123');
    await page.click('button:has-text("Sign In as Staff")');
    await page.waitForURL('**/dashboard');

    // 2. Verify Simplified Header
    await expect(page.locator('h1')).toContainText(/Welcome,\s*(Super Administrator|Administrator)/i);
    await expect(page.locator('text=Academic Session 2026-2027')).toBeVisible();

    // 3. Verify Administrative KPI Summary
    await expect(page.locator('p:has-text("Enrolled Students")')).toBeVisible();
    await expect(page.locator('p:has-text("Teaching Faculty")')).toBeVisible();
    await expect(page.locator('p:has-text("Academic Classes")')).toBeVisible();
    await expect(page.locator('p:has-text("Active Sections")')).toBeVisible();

    // 4. Verify Subject-wise Faculty & Student Overview
    await expect(page.locator('text=Subject-wise Faculty & Student Overview')).toBeVisible();
    await expect(page.locator('th:has-text("Teaching Faculty")')).toBeVisible();
    await expect(page.locator('th:has-text("Enrolled Students")')).toBeVisible();

    // Dynamic database subjects should appear in the table
    await expect(page.locator('td:has-text("Mathematics")')).toBeVisible();

    // 5. Verify NO Timetable Management controls exist on Dashboard
    await expect(page.locator('button:has-text("Create Timetable")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Edit Timetable")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Publish Timetable")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Timetable Builder")')).toHaveCount(0);
  });

  test('Backend RBAC rejects Admin timetable mutation requests with 403 Forbidden', async ({ request }) => {
    // Authenticate as Admin
    const loginRes = await request.post('http://127.0.0.1:8000/api/v1/auth/login', {
      data: {
        identifier: 'admin@school.com',
        password: 'admin@123',
      },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginJson = await loginRes.json();
    const token = loginJson.data.token;

    // Attempt timetable mutation (publish) as Admin
    const mutationRes = await request.post('http://127.0.0.1:8000/api/v1/timetables/sections/sec-10a/publish', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        isPublished: true,
      },
    });

    // Must be rejected with 403 Forbidden
    expect(mutationRes.status()).toBe(403);
    const errJson = await mutationRes.json();
    console.log('MUTATION 403 JSON:', errJson);
    const msg = errJson.detail || errJson.error?.message || errJson.message || '';
    expect(msg.toLowerCase()).toContain('forbidden');
  });
});
