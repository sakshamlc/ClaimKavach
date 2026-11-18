import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 375, height: 667 }, // Mobile-first 375px baseline
});

test.describe('ClaimKavach — End-to-End Demo Scenarios (375px mobile viewport)', () => {
  test('Scenario 1: PM-Kisan Name Order Swap Flow (English)', async ({ page }) => {
    // 1. Visit landing page
    await page.goto('/demo');
    await expect(page.locator('h1')).toContainText('Try Demo Scenarios');

    // 2. Click load Scenario 1
    const loadButtons = page.locator('button', { hasText: 'Load this scenario' });
    await loadButtons.first().click();

    // 3. Review Screen (S5) - verify pre-filled values
    await expect(page).toHaveURL(/\/review/);
    await expect(page.locator('input[value="Ramesh Kumar"]')).toBeVisible();
    await expect(page.locator('input[value="Kumar Ramesh"]')).toBeVisible();

    // 4. Click Run Pre-Flight Analysis
    const proceedBtn = page.locator('button', { hasText: 'Run Pre-Flight Analysis' });
    await proceedBtn.scrollIntoViewIfNeeded();
    await proceedBtn.click({ force: true });

    // 5. Report Screen (S6) - verify status banner and findings
    await expect(page).toHaveURL(/\/report/);
    await expect(page.locator('h1')).toContainText('Fix Needed');
    await expect(page.getByText('Name Word Order Differs')).toBeVisible();
    await expect(page.getByText('NPCI DBT Seeding Required')).toBeVisible();

    // Screenshot Report Screen (English)
    await page.screenshot({ path: 'docs/screenshots/scenario-1-report-english.png', fullPage: true });

    // 6. Fix Plan - Bank is chosen as cheapest fix
    await expect(page.locator('text=Change: Bank Passbook / Cheque').first()).toBeVisible();
    await expect(page.locator('text=Easiest (1 Branch Visit, Free)').first()).toBeVisible();

    // 7. Click Create Sample Letter
    const letterBtn = page.locator('button', { hasText: 'Create Sample Letter' });
    await letterBtn.first().scrollIntoViewIfNeeded();
    await letterBtn.first().click({ force: true });
    await expect(page).toHaveURL(/\/letter\//);
    await expect(page.locator('h1')).toContainText('Application for Correction of Name');
  });

  test('Scenario 2: Scholarship Patronymic Middle Name + DOB Swap Flow (Hindi)', async ({ page }) => {
    await page.goto('/');

    // Switch to Hindi
    await page.locator('button', { hasText: 'हिंदी' }).click();
    await expect(page.locator('h1')).toContainText('पोर्टल से रिजेक्ट होने से पहले गड़बड़ी पकड़ें');

    // Go to Demo
    await page.locator('button', { hasText: 'डेमो आज़माएँ' }).click();
    await expect(page).toHaveURL(/\/demo/);

    // Load Scenario 2
    const loadButtons = page.locator('button', { hasText: 'यह परिदृश्य लोड करें' });
    await loadButtons.nth(1).click();

    // Review Screen
    await expect(page).toHaveURL(/\/review/);
    const proceedBtn = page.locator('button', { hasText: 'विश्लेषण शुरू करें' });
    await proceedBtn.scrollIntoViewIfNeeded();
    await proceedBtn.click({ force: true });

    // Report Screen - Blocked due to DOB swap
    await expect(page).toHaveURL(/\/report/);
    await expect(page.locator('h1')).toContainText('आवेदन अटक सकता है');
    await expect(page.getByText('जन्मतिथि में दिन और महीने की अदला-बदली')).toBeVisible();
    await expect(page.getByText('पिता/पति का मध्य नाम छूटा हुआ है')).toBeVisible();

    // Screenshot Report Screen (Hindi)
    await page.screenshot({ path: 'docs/screenshots/scenario-2-report-hindi.png', fullPage: true });
  });

  test('Scenario 3: Bank KYC Invalid IFSC + Initial Abbreviation (Marathi)', async ({ page }) => {
    await page.goto('/');

    // Switch to Marathi
    await page.locator('button', { hasText: 'मराठी' }).click();
    await expect(page.locator('h1')).toContainText('पोर्टल नाकारण्यापूर्वी कागदपत्रातील चूक शोधा');

    // Go to Demo
    await page.locator('button', { hasText: 'डेमो पहा' }).click();
    await expect(page).toHaveURL(/\/demo/);

    // Load Scenario 3
    const loadButtons = page.locator('button', { hasText: 'हे उदाहरण लोड करा' });
    await loadButtons.nth(2).click();

    // Review Screen
    await expect(page).toHaveURL(/\/review/);
    const proceedBtn = page.locator('button', { hasText: 'तपासणी सुरू करा' });
    await proceedBtn.scrollIntoViewIfNeeded();
    await proceedBtn.click({ force: true });

    // Report Screen - Blocked due to invalid IFSC
    await expect(page).toHaveURL(/\/report/);
    await expect(page.locator('h1')).toContainText('अर्ज बाद होऊ शकतो');
    await expect(page.getByText('अवैध आयएफएससी (IFSC) कोड')).toBeVisible();
    await expect(page.getByText('संक्षिप्त नाव (आद्याक्षर) विरुद्ध पूर्ण नाव')).toBeVisible();

    // Screenshot Report Screen (Marathi)
    await page.screenshot({ path: 'docs/screenshots/scenario-3-report-marathi.png', fullPage: true });
  });
});
