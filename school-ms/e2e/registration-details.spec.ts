import { test, expect } from '@playwright/test';

test('admin can view complete registration details for students and teachers', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.fill('input[type="text"], input[placeholder*="admin"]', 'admin');
  await page.fill('input[type="password"]', 'SuperAdmin@123');
  await page.click('button:has-text("Sign In as Staff")');
  await page.waitForURL('**/dashboard');

  // 2. Test Student Registration Details in Enrollments
  await page.goto('/academics/enrollments');
  await page.waitForSelector('table tbody tr');

  // Find first student name button
  const studentBtn = page.locator('table tbody tr td button[title*="registration"]').first();
  await expect(studentBtn).toBeVisible();
  const studentName = (await studentBtn.innerText()).trim();
  console.log(`Clicking student: ${studentName}`);
  await studentBtn.click();

  // Verify Student Registration Details Dialog opens
  const studentDialog = page.locator('div[role="dialog"]').filter({ hasText: 'Personal Biodata' });
  await expect(studentDialog).toBeVisible();
  await expect(studentDialog.locator('text=Personal Biodata')).toBeVisible();
  await expect(studentDialog.locator('text=Academic Placement & Enrollment')).toBeVisible();
  await expect(studentDialog.locator('text=Parent & Guardian Information')).toBeVisible();
  await expect(studentDialog.locator('text=Student Portal Authentication')).toBeVisible();

  // Close Student Modal
  await studentDialog.locator('button:has-text("Close")').first().click();
  await expect(studentDialog).not.toBeVisible();

  // 3. Test Teacher Registration Details in Users/Staff Directory
  await page.goto('/users');
  await page.waitForSelector('table tbody tr');

  // Find first staff name button
  const staffBtn = page.locator('table tbody tr td button[title*="registration"]').first();
  await expect(staffBtn).toBeVisible();
  const staffName = (await staffBtn.innerText()).trim();
  console.log(`Clicking staff member: ${staffName}`);
  await staffBtn.click();

  // Verify Staff Registration Details Dialog opens
  const staffDialog = page.locator('div[role="dialog"]').filter({ hasText: 'Personal & Contact Biodata' });
  await expect(staffDialog).toBeVisible();
  await expect(staffDialog.locator('text=Personal & Contact Biodata')).toBeVisible();
  await expect(staffDialog.locator('text=Academic & Teaching Profile')).toBeVisible();
  await expect(staffDialog.locator('text=Portal Security & Account Credentials')).toBeVisible();

  // Close Staff Modal
  await staffDialog.locator('button:has-text("Close")').first().click();
  await expect(staffDialog).not.toBeVisible();
});
