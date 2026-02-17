import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('https://www.youtube.com/');

  // Expect a title "to contain" a substring.
	await page.getByPlaceholder('Search').fill('music');
	await page.keyboard.press('Enter');
	await page.waitForTimeout(3000);


});

test('get started link', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Click the get started link.
  await page.getByRole('link', { name: 'Get started' }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});
