import { test, expect } from '@playwright/test';

test.describe('Admin Panel: Principal Handover & Faculty Registration Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Authenticate as Super Admin
    await page.goto('/login');
    await page.fill('input[type="text"], input[placeholder*="admin"]', 'admin@school.com');
    await page.fill('input[type="password"]', 'admin@123');
    await page.click('button:has-text("Sign In as Staff")');
    await page.waitForURL('**/dashboard');
  });

  test('Faculty Registration: Success flow closes modal, resets form, and updates list', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    const uniqueId = Date.now().toString().slice(-4);
    const facultyName = `Prof. Test Faculty ${uniqueId}`;
    const facultyEmail = `prof.faculty.${uniqueId}@gmail.com`;

    // 1. Click + Enroll Faculty Member
    await page.click('button:has-text("+ Enroll Faculty Member")');

    // 2. Modal opens and form is presented
    const modalTitle = page.locator('text=Provision Account (Hierarchical)');
    await expect(modalTitle).toBeVisible();

    // 3. Fill faculty fields
    await page.fill('input[placeholder="e.g. Smt. Gayatri Rao"]', facultyName);
    await page.fill('input[placeholder="gayatri.rao@gmail.com"]', facultyEmail);
    await page.fill('input[placeholder="Mathematics & Science"]', 'Computer Science');

    // 4. Click Confirm & Enroll Faculty
    const confirmBtn = page.locator('button:has-text("Confirm & Enroll Faculty")');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // 5. Verification: Modal closes automatically
    await expect(modalTitle).not.toBeVisible({ timeout: 10000 });

    // 6. Verification: Success toast appears with generated password
    const successToast = page.locator('text=Faculty registered successfully');
    await expect(successToast).toBeVisible();

    // 7. Verification: Faculty appears in the list without page reload
    const facultyRow = page.locator(`text=${facultyName}`);
    await expect(facultyRow).toBeVisible();
  });

  test('Faculty Registration: Failure flow keeps modal open and preserves entered values', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    // Click + Enroll Faculty Member
    await page.click('button:has-text("+ Enroll Faculty Member")');

    const modalTitle = page.locator('text=Provision Account (Hierarchical)');
    await expect(modalTitle).toBeVisible();

    // Fill with already existing email (e.g., Sakshi Kotagi's email sakshi@gmail.com)
    const nameInput = page.locator('input[placeholder="e.g. Smt. Gayatri Rao"]');
    const emailInput = page.locator('input[placeholder="gayatri.rao@gmail.com"]');

    await nameInput.fill('Duplicate Sakshi');
    await emailInput.fill('sakshi@gmail.com');

    // Click Confirm & Enroll Faculty
    await page.click('button:has-text("Confirm & Enroll Faculty")');

    // Modal MUST remain open on failure
    await expect(modalTitle).toBeVisible();

    // Error toast appears
    const errorToast = page.locator('text=already exists');
    await expect(errorToast).toBeVisible();

    // Entered values must be preserved
    await expect(nameInput).toHaveValue('Duplicate Sakshi');
    await expect(emailInput).toHaveValue('sakshi@gmail.com');

    // Cancel out
    await page.click('button:has-text("Cancel")');
    await expect(modalTitle).not.toBeVisible();
  });

  test('Reopening Faculty Form presents a fresh clean form', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    // Reopen + Enroll Faculty Member
    await page.click('button:has-text("+ Enroll Faculty Member")');

    const nameInput = page.locator('input[placeholder="e.g. Smt. Gayatri Rao"]');
    const emailInput = page.locator('input[placeholder="gayatri.rao@gmail.com"]');

    // Form inputs must be empty
    await expect(nameInput).toHaveValue('');
    await expect(emailInput).toHaveValue('');

    await page.click('button:has-text("Cancel")');
  });

  test('Principal Display: No active principal appointed state & appointment capability', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    // 1. Verify card displays pending appointment when no principal in DB
    await expect(page.getByRole('heading', { name: 'No Active Principal Appointed' })).toBeVisible();
    await expect(page.locator('text=Pending Appointment')).toBeVisible();
    await expect(page.locator('button:has-text("+ Appoint Principal")')).toBeVisible();
  });

  test('Principal Handover UI: Successor form execution and atomic handover', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    // Click direct Handover button on Institutional Principal card
    const handoverCardBtn = page.locator('button:has-text("Handover Principal Role")');
    if (await handoverCardBtn.isVisible()) {
      await handoverCardBtn.click();
    } else {
      await page.click('button:has-text("+ Enroll Faculty Member")');
      await page.locator('[role="dialog"]').locator('button:has-text("Principal")').click();
      await page.click('button:has-text("Handover to New Principal")');
    }

    // Handover modal is open
    const handoverTitle = page.locator('text=Institutional Principal Handover');
    await expect(handoverTitle).toBeVisible();

    // Fill in Successor Details
    const uniqueSuffix = Date.now().toString().slice(-4);
    await page.fill('input[placeholder="Dr. Preeti Sharma"]', `Dr. Successor ${uniqueSuffix}`);
    await page.fill('input[placeholder="preeti@meghaschool.edu.in"]', `successor${uniqueSuffix}@meghaschool.edu.in`);
    await page.fill('input[placeholder="Initial secure password"]', 'SuccessorPass@2026');

    // Click Confirm & Execute Handover
    await page.click('button:has-text("Confirm & Execute Handover")');

    // Modal must automatically close upon success
    await expect(handoverTitle).not.toBeVisible({ timeout: 10000 });

    // Success toast appears
    const toast = page.locator('text=Principal handover completed successfully');
    await expect(toast).toBeVisible();
  });

});
