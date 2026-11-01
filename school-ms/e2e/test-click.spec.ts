import { test, expect } from '@playwright/test';

test('click sections on /academics/classes and check for errors', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('/login');
  await page.fill('input[type="text"], input[placeholder*="admin"]', 'admin@school.com');
  await page.fill('input[type="password"]', 'admin@123');
  await page.click('button:has-text("Sign In as Staff")');
  await page.waitForURL('**/dashboard');

  await page.goto('/academics/classes');
  await page.waitForTimeout(2000);

  const buttons = page.locator('button:has-text("students")');
  const count = await buttons.count();
  console.log(`Found ${count} section arm buttons`);

  for (let i = 0; i < Math.min(count, 5); i++) {
    const text = await buttons.nth(i).innerText();
    console.log(`Clicking button ${i}: ${text.replace(/\n/g, ' ')}`);
    await buttons.nth(i).click();
    await page.waitForTimeout(500);
  }
});
