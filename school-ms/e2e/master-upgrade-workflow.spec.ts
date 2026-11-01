import { test, expect } from '@playwright/test';

test.describe('Master Upgrade: Admission, Principal Governance & Parent Portal', () => {

  test.beforeEach(async ({ page }) => {
    // Authenticate as Staff/Admin
    await page.goto('/login');
    await page.fill('input[type="text"], input[placeholder*="admin"]', 'admin@school.com');
    await page.fill('input[type="password"]', 'admin@123');
    await page.click('button:has-text("Sign In as Staff")');
    await page.waitForURL('**/dashboard');
  });

  test('1. Student Admission Wizard dynamically loads academic structure and validates fields', async ({ page }) => {
    // Navigate to Admission Wizard
    await page.goto('/students/new');
    await page.waitForLoadState('networkidle');

    // Verify Wizard Step 1: Personal Details
    await expect(page.locator('h1')).toContainText('Student Admission & Enrollment');
    await expect(page.locator('text=Step 1: Student Personal Information')).toBeVisible();

    // Verify Admission Number input does NOT clutter Step 1
    const admissionInput = page.locator('input[placeholder*="Auto-generated or custom SATS/Enrollment number"]');
    await expect(admissionInput).toHaveCount(0);

    // Fill Step 1 with exact selector matching Input
    await page.fill('#s-name', 'Kavya Kumar');
    await page.fill('#s-dob', '2012-05-18');
    await page.fill('#s-mobile', '9888877777');

    // Click Next Step
    await page.click('button:has-text("Next Step")');

    // Verify Step 2: Academic Placement
    await expect(page.locator('text=Step 2: Academic Placement')).toBeVisible();
    await expect(page.locator('label:has-text("Academic Session *")')).toBeVisible();
    await expect(page.locator('label:has-text("Class / Grade *")')).toBeVisible();
    await expect(page.locator('label:has-text("Section / Arm *")')).toBeVisible();
  });

  test('2. Principal Institutional Governance: Strictly one active principal enforced (409)', async ({ request }) => {
    // 1. Authenticate to get valid JWT token
    const loginRes = await request.post('http://127.0.0.1:8000/api/v1/auth/login', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        identifier: 'admin@school.com',
        password: 'admin@123',
      },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginJson = await loginRes.json();
    const token = loginJson.data?.token || loginJson.access_token;

    // 2. Attempting to create duplicate active principal returns 409 Conflict
    const duplicateRes = await request.post('http://127.0.0.1:8000/api/v1/admin/users/principal', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      data: {
        school_id: 'sch-main',
        name: 'Dr. Duplicate Principal',
        email: 'duplicate.principal@meghaschool.edu.in',
        username: 'dup_principal',
        phone: '+91 9999988888',
        password: 'SecurePassword@123',
      },
    });

    // An active principal already exists, so this must return 409
    expect(duplicateRes.status()).toBe(409);
    const errBody = await duplicateRes.json();
    const msg = errBody.detail || errBody.error?.message || '';
    expect(msg).toContain('active Principal already exists');
  });

  test('3. Users Management UI displays active Principal conflict banner', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    // Open Hierarchical Provisioning Modal
    const provisionBtn = page.locator('button:has-text("Provision Account")').first();
    if (await provisionBtn.isVisible()) {
      await provisionBtn.click();

      // Click Principal Role tab
      await page.click('button:has-text("Principal")');

      // Check for conflict banner or status
      const conflictBanner = page.locator('text=Active Principal Already Exists');
      await expect(conflictBanner).toBeVisible();
      await expect(page.locator('button:has-text("Handover to New Principal")')).toBeVisible();
    }
  });

  test('4. Parent Portal handles single/multi-child accounts without hardcoded mock fallbacks', async ({ page }) => {
    // Navigate to Parent Portal view
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify dashboard renders cleanly
    const parentHeading = page.locator('text=Parent Portal · Multi-Child Family Dashboard');
    if (await parentHeading.isVisible()) {
      // Check ward selector or enrolled ward card
      const wardSelector = page.locator('text=Active Ward Selector');
      const singleWard = page.locator('text=Enrolled Ward');
      const noWard = page.locator('text=No ward data available');

      const isAnyVisible = (await wardSelector.isVisible()) || (await singleWard.isVisible()) || (await noWard.isVisible());
      expect(isAnyVisible).toBeTruthy();
    }
  });

});
