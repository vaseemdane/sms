import { test, expect } from '@playwright/test';

test.describe('Academic Architecture & Governance Workflow', () => {

  test.beforeEach(async ({ page }) => {
    // Authenticate as Super Admin
    await page.goto('/login');
    await page.fill('input[type="text"], input[placeholder*="admin"]', 'admin@school.com');
    await page.fill('input[type="password"]', 'admin@123');
    await page.click('button:has-text("Sign In as Staff")');
    // Wait until navigated into app
    await page.waitForURL('**/dashboard');
  });

  test('1. Verify Academic Sessions page loads and contains single source of truth UI', async ({ page }) => {
    await page.goto('/academics/sessions');
    await expect(page.locator('h1')).toContainText('Academic Sessions');
    await expect(page.locator('text=Configured Academic Years')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('2. Verify Academic Streams page loads with specialization tracks', async ({ page }) => {
    await page.goto('/academics/streams');
    await expect(page.locator('h1')).toContainText('Academic Streams');
    await expect(page.locator('text=Configured Streams')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('3. Verify Section Management page loads with stream & capacity controls', async ({ page }) => {
    await page.goto('/academics/sections');
    await expect(page.locator('h1')).toContainText('Section Management');
    await expect(page.locator('text=Active Class Sections')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('4. Verify Enrollment & Roll Numbers page hierarchy (Session -> Class -> Stream -> Section)', async ({ page }) => {
    await page.goto('/academics/enrollments');
    await expect(page.locator('h1')).toContainText('Academic Enrollment & Roll Numbers');
    await expect(page.locator('text=1. Academic Session')).toBeVisible();
    await expect(page.locator('text=2. Class / Grade')).toBeVisible();
    await expect(page.locator('text=3. Stream (11th/12th)')).toBeVisible();
    await expect(page.locator('text=4. Section')).toBeVisible();

    // Verify Action column header for Admin deletion
    await expect(page.locator('th:has-text("Action")')).toBeVisible();
  });

  test('5. Verify Fee Structures dynamically loads database driven tariffs', async ({ page }) => {
    await page.goto('/fees/structures');
    await expect(page.locator('h1')).toContainText('Yearly Fee Structures');
    await expect(page.locator('text=Class Yearly Tariffs')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });
});
