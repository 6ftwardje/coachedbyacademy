import { expect, test } from "@playwright/test";

test("student can open the dashboard, modules and an available module", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /Welkom terug/ })).toBeVisible();

  await page.getByRole("link", { name: "Modules" }).first().click();
  await expect(page).toHaveURL(/\/modules$/);
  await expect(page.getByRole("heading", { name: "Modules", exact: true })).toBeVisible();

  const availableModule = page.locator('a[href^="/modules/"]').first();
  await expect(availableModule).toBeVisible();
  await availableModule.click();
  await expect(page).toHaveURL(/\/modules\/[^/]+$/);
});

test("student can open an available lesson without changing progress", async ({ page }) => {
  await page.goto("/modules");
  const availableModule = page.locator('a[href^="/modules/"]').first();
  await expect(availableModule).toBeVisible();
  await availableModule.click();

  const availableLesson = page.locator('a[href^="/lessons/"]').first();
  await expect(availableLesson).toBeVisible();
  await availableLesson.click();

  await expect(page).toHaveURL(/\/lessons\/[^/]+$/);
  await expect(page.getByRole("navigation", { name: "Navigatie tussen lessen" })).toBeVisible();
});
