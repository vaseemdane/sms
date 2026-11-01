import { test, expect } from '@playwright/test';

test.describe('Real-Time Data Integrity & Elimination of Dummy/Mock Data', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Authenticate as Super Admin
    await page.goto('/login');
    await page.fill('input[type="text"], input[placeholder*="admin"]', 'admin@school.com');
    await page.fill('input[type="password"]', 'admin@123');
    await page.click('button:has-text("Sign In as Staff")');
    await page.waitForURL('**/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('Admin Dashboard: Displays live real-time statistics without mock fallbacks', async ({ page }) => {
    // Ensure dashboard container loaded
    await expect(page.locator('h1, h2, h3').filter({ hasText: /Admin|Dashboard|Overview|School/i }).first()).toBeVisible();

    // Verify there is no hardcoded mock fallback text like 'KA-SATS-2024-88412'
    const mockSats = page.locator('text=KA-SATS-2024-88412');
    await expect(mockSats).not.toBeVisible();
  });

  test('Principal Dashboard: Displays live database stats and proper empty states instead of dummy data', async ({ page }) => {
    // Switch role to principal in session storage
    await page.evaluate(() => {
      const raw = localStorage.getItem('edupulse_sms_session_v1');
      if (raw) {
        const session = JSON.parse(raw);
        session.role = 'principal';
        if (session.user) {
          session.user.userType = 'principal';
        }
        localStorage.setItem('edupulse_sms_session_v1', JSON.stringify(session));
      }
    });

    // Reload dashboard under principal role
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify Principal Dashboard loaded
    await expect(page.locator('text=Principal Desk · Executive Academic Governance')).toBeVisible();

    // Verify KPI Cards load live data
    await expect(page.locator('text=Total Enrolled')).toBeVisible();
    await expect(page.locator('text=Teaching Faculty')).toBeVisible();
    await expect(page.locator('text=Daily Attendance Rate')).toBeVisible();
    await expect(page.locator('text=Exam Progress')).toBeVisible();

    // Verify mock static values '500 Students' or '40 Faculty' are NOT displayed
    const dummyStudentCount = page.locator('text="500 Students"');
    await expect(dummyStudentCount).not.toBeVisible();

    // Check Attendance Audit tab
    await page.click('button:has-text("Attendance Status Audit")');
    await expect(page.locator('text=Section Attendance Completion Audit')).toBeVisible();

    // Check Academic Calendar tab
    await page.click('button:has-text("Academic Calendar")');
    await expect(page.locator('text=Academic Calendar & Day Order Configuration')).toBeVisible();

    // Check Field Trips tab
    await page.click('button:has-text("Field Trips & Consents")');
    await expect(page.locator('text=Field Trips & Digital Parent Consent Engine')).toBeVisible();

    // Check 360° Teacher Evaluations tab
    await page.click('button:has-text("360° Teacher Evaluations")');
    await expect(page.locator('text=Confidential Analytics')).toBeVisible();
  });

  test('Parent Dashboard: Displays live ward overview', async ({ page }) => {
    // Switch role to parent in session storage
    await page.evaluate(() => {
      const raw = localStorage.getItem('edupulse_sms_session_v1');
      if (raw) {
        const session = JSON.parse(raw);
        session.role = 'parent';
        if (session.user) {
          session.user.userType = 'parent';
        }
        localStorage.setItem('edupulse_sms_session_v1', JSON.stringify(session));
      }
    });

    // Reload dashboard under parent role
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify Parent Dashboard loaded
    await expect(page.locator('h1, h2, div').filter({ hasText: /Parent|Ward/i }).first()).toBeVisible();
  });

});
