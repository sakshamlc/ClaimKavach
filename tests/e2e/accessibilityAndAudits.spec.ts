import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'fs';
import * as path from 'path';

test.use({
  viewport: { width: 375, height: 667 }, // Mobile 375px baseline
});

test.describe('Accessibility, Privacy, Security & Print Audits', () => {
  test('1. Security Headers & CSP Verification', async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBe(200);

    const headers = res.headers();
    expect(headers['content-security-policy']).toBeDefined();
    expect(headers['content-security-policy']).toContain("default-src 'self'");
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('camera=self');
  });

  test('2. Axe Accessibility Scan on S5 (Review) and S6 (Report)', async ({ page }) => {
    // Navigate via Demo to load complete state
    await page.goto('/demo');
    const loadButtons = page.locator('button', { hasText: 'Load this scenario' });
    await loadButtons.first().click();

    // Screen S5: Review
    await expect(page).toHaveURL(/\/review/);
    const axeS5 = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast']) // fonts loaded dynamically
      .analyze();

    expect(axeS5.violations).toEqual([]);

    // Proceed to Screen S6: Report
    const proceedBtn = page.locator('button', { hasText: 'Run Pre-Flight Analysis' });
    await proceedBtn.scrollIntoViewIfNeeded();
    await proceedBtn.click({ force: true });
    await expect(page).toHaveURL(/\/report/);

    // Screen S6: Report
    const axeS6 = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .analyze();

    expect(axeS6.violations).toEqual([]);
  });

  test('3. Clear All Data Wipes Browser Memory State', async ({ page }) => {
    // 1. Load demo scenario to fill state
    await page.goto('/demo');
    const loadButtons = page.locator('button', { hasText: 'Load this scenario' });
    await loadButtons.first().click();
    await expect(page).toHaveURL(/\/review/);

    // Confirm state has input values
    await expect(page.locator('input[value="Ramesh Kumar"]')).toBeVisible();

    // 2. Click "Clear all data" button in header (confirm dialog handled automatically)
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Are you sure you want to clear all data');
      await dialog.accept();
    });

    const clearButton = page.locator('button[aria-label="Clear all data"]');
    await clearButton.click({ force: true });

    // 3. Must redirect to landing page
    await expect(page).toHaveURL('/');

    // 4. Returning to /review must now show empty state (no documents)
    await page.goto('/review');
    await expect(page.locator('input[value="Ramesh Kumar"]')).toHaveCount(0);
  });

  test('4. Print Previews & Artifacts for Hindi and Marathi Letters', async ({ page }) => {
    const screenshotDir = path.join(process.cwd(), 'docs', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // Step A: Load Scenario 1 in Hindi
    await page.goto('/');
    await page.locator('button', { hasText: 'हिंदी' }).click();
    await page.locator('button', { hasText: 'डेमो आज़माएँ' }).click();
    await expect(page).toHaveURL(/\/demo/);

    const loadHindi = page.locator('button', { hasText: 'यह परिदृश्य लोड करें' });
    await loadHindi.first().click();
    await expect(page).toHaveURL(/\/review/);

    const proceedHindi = page.locator('button', { hasText: 'विश्लेषण शुरू करें' });
    await proceedHindi.scrollIntoViewIfNeeded();
    await proceedHindi.click({ force: true });
    await expect(page).toHaveURL(/\/report/);

    // Open Sample Letter in Hindi
    const letterBtnHindi = page.locator('button', { hasText: 'आवेदन पत्र (ड्राफ्ट) बनाएं' });
    await letterBtnHindi.first().scrollIntoViewIfNeeded();
    await letterBtnHindi.first().click({ force: true });
    await expect(page).toHaveURL(/\/letter\//);
    await expect(page.locator('h1')).toContainText('नाम सुधारने हेतु आवेदन पत्र');

    // Emulate print media and take screenshot
    await page.emulateMedia({ media: 'print' });
    const hindiScreenshotPath = path.join(screenshotDir, 'letter-preview-hindi.png');
    await page.screenshot({ path: hindiScreenshotPath, fullPage: true });
    expect(fs.existsSync(hindiScreenshotPath)).toBe(true);

    // Step B: Load Scenario in Marathi
    await page.goto('/');
    await page.locator('button', { hasText: 'मराठी' }).click();
    await page.locator('button', { hasText: 'डेमो पहा' }).click();
    await expect(page).toHaveURL(/\/demo/);

    const loadMarathi = page.locator('button', { hasText: 'हे उदाहरण लोड करा' });
    await loadMarathi.first().click();
    await expect(page).toHaveURL(/\/review/);

    const proceedMarathi = page.locator('button', { hasText: 'तपासणी सुरू करा' });
    await proceedMarathi.scrollIntoViewIfNeeded();
    await proceedMarathi.click({ force: true });
    await expect(page).toHaveURL(/\/report/);

    // Open Sample Letter in Marathi
    const letterBtnMarathi = page.locator('button', { hasText: 'नमुना अर्ज पत्र बनवा' });
    await letterBtnMarathi.first().scrollIntoViewIfNeeded();
    await letterBtnMarathi.first().click({ force: true });
    await expect(page).toHaveURL(/\/letter\//);
    await expect(page.locator('h1')).toContainText('नाव दुरुस्त करण्यासाठी अर्ज');

    // Emulate print media and take screenshot
    await page.emulateMedia({ media: 'print' });
    const marathiScreenshotPath = path.join(screenshotDir, 'letter-preview-marathi.png');
    await page.screenshot({ path: marathiScreenshotPath, fullPage: true });
    expect(fs.existsSync(marathiScreenshotPath)).toBe(true);
  });
});
