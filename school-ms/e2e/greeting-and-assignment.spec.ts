import { test, expect } from '@playwright/test';

test('timezone greeting and principal class teacher assignment verification', async ({ page }) => {
  // 1. Sign in as admin (zuha)
  await page.goto('/login');
  await page.fill('input[type="text"], input[placeholder*="admin"]', 'admin');
  await page.fill('input[type="password"]', 'SuperAdmin@123');
  await page.click('button:has-text("Sign In as Staff")');
  await page.waitForURL('**/dashboard');

  // 2. Verify Dashboard Greeting uses time of day + name
  const hour = new Date().getHours();
  const expectedGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const heading = page.locator('h1').first();
  await expect(heading).toContainText(expectedGreeting);
  await expect(heading).toContainText('zuha');

  // 3. Visit Staff & Faculty Directory
  await page.goto('/users');
  await page.waitForSelector('table tbody tr');

  // Switch to Leadership & Admins tab to check Super Admin row
  await page.click('button:has-text("Leadership & Admins")');
  const zuhaRow = page.locator('table tbody tr').filter({ hasText: 'zuha' });
  await expect(zuhaRow).toBeVisible();
  // Super Admin row should NOT have "+ Assign Class & Section"
  await expect(zuhaRow).not.toContainText('+ Assign Class & Section');
  await expect(zuhaRow).toContainText('System Governance');

  // 4. Switch to Teaching Faculty tab
  await page.click('button:has-text("Teaching Faculty")');
  const teacherRow = page.locator('table tbody tr').first();
  await expect(teacherRow).toBeVisible();
  const assignBtn = teacherRow.locator('button:has-text("Assign Class")');
  await assignBtn.click();

  // Verify Modal
  const modal = page.locator('div[role="dialog"]').filter({ hasText: 'Assign Class Teacher' });
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('Principal Authority');
  await expect(modal).toContainText('Principal Governance');

  // Click section select and verify it lists sections (NOT just Unassign)
  const selectTrigger = modal.locator('button').filter({ hasText: /Select class section arm/ });
  await selectTrigger.click();

  const options = page.locator('[role="option"]');
  const count = await options.count();
  expect(count).toBeGreaterThan(5); // should have all classes and sections
  await options.nth(1).click();

  // Save Assignment
  await modal.locator('button[type="submit"]:has-text("Save Assignment")').click();
  await expect(modal).not.toBeVisible();
});
