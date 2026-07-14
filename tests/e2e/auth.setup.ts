import { expect, test as setup } from "@playwright/test";
import { authFile } from "../../playwright.config";

setup("authenticate dedicated test student", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error("E2E_EMAIL and E2E_PASSWORD are required for authenticated checks.");
  }

  await page.goto("/");
  await page.getByLabel("E-mailadres").fill(email);
  await page.getByLabel("Wachtwoord").fill(password);
  await page.getByRole("button", { name: "Inloggen", exact: true }).last().click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("navigation", { name: "Hoofdnavigatie" })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
