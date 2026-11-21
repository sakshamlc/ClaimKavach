import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 375, height: 667 }, // Mobile-first 375px baseline
});

test.describe('ClaimKavach — End-to-End Hospital Bill Audit Flow (375px mobile viewport)', () => {
  test('Scenario 1: Consent Acceptance & Sample Bill Loading', async ({ page }) => {
    // 1. Visit landing page
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();

    // 2. Click Try Demo Bill directly (auto-consents and loads sample1 into verify page)
    const demoBtn = page.locator('button', { hasText: 'Try Demo Bill' });
    await demoBtn.click();

    // 3. Verify Screen should be displayed
    await expect(page).toHaveURL(/\/verify/);
    await expect(page.locator('text=Verify & Edit Bill Line Items')).toBeVisible();
  });

  test('Scenario 2: Line Item Verification & Run Statutory Audit', async ({ page }) => {
    // 1. Load sample via demo on landing
    await page.goto('/');
    const demoBtn = page.locator('button', { hasText: 'Try Demo Bill' });
    await demoBtn.click();
    await expect(page).toHaveURL(/\/verify/);

    // 2. Toggle "I checked this" on first item if checkbox present
    const checkToggles = page.locator('input[type="checkbox"]');
    if ((await checkToggles.count()) > 0) {
      await checkToggles.first().click();
    }

    // 3. Run Statutory Audit
    const auditBtn = page.locator('button', { hasText: 'Run Statutory Audit' });
    await auditBtn.scrollIntoViewIfNeeded();
    await auditBtn.click({ force: true });

    // 4. Must navigate to /report
    await expect(page).toHaveURL(/\/report/);
    await expect(page.locator('text=Hospital Bill Statutory & Arithmetic Audit Report')).toBeVisible();
  });

  test('Scenario 3: Report Financial Cards & Dispute Notice Pack', async ({ page }) => {
    // 1. Navigate to /report after audit
    await page.goto('/');
    const demoBtn = page.locator('button', { hasText: 'Try Demo Bill' });
    await demoBtn.click();
    await expect(page).toHaveURL(/\/verify/);

    const auditBtn = page.locator('button', { hasText: 'Run Statutory Audit' });
    await auditBtn.scrollIntoViewIfNeeded();
    await auditBtn.click({ force: true });
    await expect(page).toHaveURL(/\/report/);

    // 2. Verify financial cards exist
    await expect(page.locator('text=Total Billed')).toBeVisible();
    await expect(page.locator('text=Confirmed Overcharge')).toBeVisible();

    // 3. Open Dispute Notice Pack
    const disputeTab = page.locator('button', { hasText: 'Dispute Notice Pack' });
    if ((await disputeTab.count()) > 0) {
      await disputeTab.click();
      await expect(page.locator('text=Patient Dispute Pack & Escalation Drafts')).toBeVisible();
    }
  });
});
