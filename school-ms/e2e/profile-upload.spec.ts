import { test, expect } from '@playwright/test';

test('super admin can upload and remove profile photo', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[type="text"], input[placeholder*="admin"]', 'admin');
  await page.fill('input[type="password"]', 'SuperAdmin@123');
  await page.click('button:has-text("Sign In as Staff")');
  await page.waitForURL('**/dashboard');

  // Navigate to profile settings
  await page.goto('/settings/profile');
  await expect(page.locator('h1')).toHaveText('Personal Profile & Credentials');

  // Verify initial state
  const uploadButton = page.locator('button:has-text("Upload New Photo")');
  await expect(uploadButton).toBeVisible();

  // Create a minimal 1x1 PNG data buffer
  const png1x1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );

  // Upload file via hidden file input
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'test-avatar.png',
    mimeType: 'image/png',
    buffer: png1x1,
  });

  // Check success feedback
  await expect(page.locator('text=Photo updated successfully!')).toBeVisible();

  // Check avatar image is now rendered in profile card
  const avatarImg = page.locator('.space-y-6 .h-24.w-24 img');
  await expect(avatarImg).toBeVisible();

  // Verify persistence after reload
  await page.reload();
  await expect(avatarImg).toBeVisible();

  // Test remove photo button
  const removeButton = page.locator('button:has-text("Remove Photo")');
  await expect(removeButton).toBeVisible();
  await removeButton.click();

  // Verify photo is removed and fallback initials are shown
  await expect(avatarImg).not.toBeVisible();
  await expect(page.locator('.space-y-6 .h-24.w-24').locator('text=/ZU|SU/')).toBeVisible();
});

