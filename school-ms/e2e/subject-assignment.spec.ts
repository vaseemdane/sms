import { test, expect } from '@playwright/test';

test('principal/admin can view specific subjects, add custom subject, and assign to teacher', async ({ page }) => {
  // 1. Login as Super Admin
  await page.goto('/login');
  await page.fill('input[type="text"], input[placeholder*="admin"]', 'admin');
  await page.fill('input[type="password"]', 'SuperAdmin@123');
  await page.click('button:has-text("Sign In as Staff")');
  await page.waitForURL('**/dashboard');

  // 2. Visit Staff Directory /users
  await page.goto('/users');
  const firstTeacherBtn = page.locator('table tbody tr td button[title*="registration"]').first();
  await expect(firstTeacherBtn).toBeVisible({ timeout: 10000 });

  // Verify that specific subjects are visible (NOT "General Faculty")
  const tableText = await page.locator('table tbody').innerText();
  expect(tableText).not.toContain('General Faculty');
  expect(tableText).toMatch(/Mathematics|Social Science|Kannada|Science|Physics/);

  // 3. Visit /academics/subjects (Subject Faculty & Curriculum)
  await page.goto('/academics/subjects');
  await expect(page.locator('h1')).toHaveText('Subjects & Faculty Allocation');

  // Verify subjects list rendered
  await expect(page.locator('table tbody tr').first()).toBeVisible();

  // Create a Custom Subject
  const customSubjectName = `Robotics-${Date.now().toString().slice(-4)}`;
  const addSubjectBtn = page.locator('button:has-text("+ Add Custom Subject")');
  await expect(addSubjectBtn).toBeVisible();
  await addSubjectBtn.click();

  // Fill custom subject form
  await page.fill('#subName', customSubjectName);
  await page.fill('#subCode', `ROB-${Date.now().toString().slice(-3)}`);
  await page.click('button[type="submit"]:has-text("Create Subject")');

  // Verify custom subject appears in table
  await page.fill('input[placeholder*="Search subject"]', customSubjectName);
  await expect(page.locator(`text=${customSubjectName}`).first()).toBeVisible();

  // 4. Return to /users and assign subject to a teacher
  await page.goto('/users');
  await page.waitForSelector('table tbody tr');

  // Click "+ Assign Class & Section" on first teacher
  const assignBtn = page.locator('button:has-text("Assign Class")').first();
  await assignBtn.click();

  // Verify Assignment Modal opens
  const assignModal = page.locator('div[role="dialog"]').filter({ hasText: /Assign Class Teacher|Faculty Academic Assignment/ });
  await expect(assignModal).toBeVisible();

  // Select section
  const sectionTrigger = assignModal.locator('button').filter({ hasText: /Select class section arm/ });
  await sectionTrigger.click();
  const option = page.locator('[role="option"]').first();
  await option.waitFor({ state: 'visible', timeout: 5000 });
  await option.click();

  // Save assignment
  await assignModal.locator('button[type="submit"]:has-text("Save Assignment")').click();

  // Modal should close
  await expect(assignModal).not.toBeVisible();
});
