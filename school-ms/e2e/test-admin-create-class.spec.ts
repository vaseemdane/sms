import { test, expect } from '@playwright/test';

test.describe('Classes & Grades Dynamic Admin Management', () => {

  test('Admin creates a customized class with order priority', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('response', res => {
      if (res.url().includes('/api/v1/academics/classes')) {
        console.log('CLASSES API RES:', res.status(), res.url());
      }
    });

    await page.goto('/login');
    await page.locator('input[type="text"]').first().fill('admin@school.com');
    await page.locator('input[type="password"]').fill('admin@123');
    await page.click('button:has-text("Sign In as Staff")');
    await page.waitForURL('**/dashboard');

    await page.goto('/academics/classes');
    await expect(page.locator('h1')).toContainText('Classes & Grades Architecture');

    // Click top Create Class / Grade button
    await page.click('button:has-text("Create Class / Grade")');
    await expect(page.locator('text=Create New Class / Grade')).toBeVisible();

    const uniqueClassName = `Special Grade ${Date.now().toString().slice(-4)}`;
    await page.fill('#c-name', uniqueClassName);
    await page.fill('#c-order', '25');

    // Submit specifically inside dialog footer
    const submitBtn = page.locator('button[type="submit"]:has-text("Create Class")');
    await submitBtn.click();

    // Check if error alert appears
    const errAlert = page.locator('.bg-destructive\\/15');
    if (await errAlert.isVisible()) {
      console.log('ERROR ON PAGE:', await errAlert.innerText());
    }

    // Verify it appears in table
    await expect(page.locator(`text=${uniqueClassName}`)).toBeVisible();

    // Now test Delete Class option on that row
    const classRow = page.locator('tr', { hasText: uniqueClassName });
    await classRow.locator('button[title="Delete Class"]').click();

    // Dialog opens
    await expect(page.locator('text=Confirm Class Deletion')).toBeVisible();

    // Confirm deletion
    await page.locator('button:has-text("Delete Class")').click();

    // Verify row is deleted / no longer in table body
    await expect(page.locator('tbody tr', { hasText: uniqueClassName })).toHaveCount(0);
  });
});

