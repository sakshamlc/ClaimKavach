import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACT_DIR = 'C:/Users/Administrator/.gemini/antigravity/brain/f26d2e7f-30dc-497b-bd87-786b9970610b';
const SCREENSHOT_DIR = path.resolve('docs/screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.use({
  viewport: { width: 375, height: 667 }, // 375px mobile viewport
});

test.describe('Invalid IFSC Finding Card at 375px Viewport (EN, HI, MR)', () => {
  test('Capture Invalid IFSC Card in English, Hindi, and Marathi at 375px', async ({ page }) => {
    // 1. Load Scenario 3 in English
    await page.goto('/demo');
    await page.locator('button', { hasText: 'English' }).click();

    const loadButtons = page.locator('button', { hasText: 'Load this scenario' });
    await loadButtons.nth(2).click(); // Scenario 3

    await expect(page).toHaveURL(/\/review/);
    const proceedBtn = page.locator('button', { hasText: 'Run Pre-Flight Analysis' });
    await proceedBtn.scrollIntoViewIfNeeded();
    await proceedBtn.click({ force: true });

    await expect(page).toHaveURL(/\/report/);

    // Find the Invalid IFSC card (contains the invalid IFSC value SBIN1000123)
    const ifscCard = page.locator('div.rounded-card').filter({ hasText: 'SBIN1000123' });
    await expect(ifscCard).toBeVisible();

    // Verify English plain sentence hint (not split into word chips)
    await expect(ifscCard).toContainText('4 letters, then the digit 0, then 6 letters or digits');
    await expect(ifscCard).toContainText('SBIN0001234');

    // Screenshot English card
    const enScreenshotPath = path.join(SCREENSHOT_DIR, 'ifsc-card-375px-en.png');
    await ifscCard.screenshot({ path: enScreenshotPath });
    if (fs.existsSync(ARTIFACT_DIR)) {
      fs.copyFileSync(enScreenshotPath, path.join(ARTIFACT_DIR, 'ifsc-card-375px-en.png'));
    }

    // 2. Switch to Hindi
    await page.locator('button', { hasText: 'हिंदी' }).click();
    await page.waitForTimeout(500);

    // Verify Hindi plain sentence hint
    await expect(ifscCard).toContainText('4 अक्षर, फिर अंक 0, फिर 6 अक्षर या अंक');
    await expect(ifscCard).toContainText('SBIN0001234');

    // Screenshot Hindi card
    const hiScreenshotPath = path.join(SCREENSHOT_DIR, 'ifsc-card-375px-hi.png');
    await ifscCard.screenshot({ path: hiScreenshotPath });
    if (fs.existsSync(ARTIFACT_DIR)) {
      fs.copyFileSync(hiScreenshotPath, path.join(ARTIFACT_DIR, 'ifsc-card-375px-hi.png'));
    }

    // 3. Switch to Marathi
    await page.locator('button', { hasText: 'मराठी' }).click();
    await page.waitForTimeout(500);

    // Verify Marathi plain sentence hint
    await expect(ifscCard).toContainText('४ अक्षरे, नंतर ० हा अंक, नंतर ६ अक्षरे किंवा अंक');
    await expect(ifscCard).toContainText('SBIN0001234');

    // Screenshot Marathi card
    const mrScreenshotPath = path.join(SCREENSHOT_DIR, 'ifsc-card-375px-mr.png');
    await ifscCard.screenshot({ path: mrScreenshotPath });
    if (fs.existsSync(ARTIFACT_DIR)) {
      fs.copyFileSync(mrScreenshotPath, path.join(ARTIFACT_DIR, 'ifsc-card-375px-mr.png'));
    }
  });
});
