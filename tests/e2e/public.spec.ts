import { expect, test } from "@playwright/test";

test("login page exposes the expected authentication controls", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Groei verder als coach." })
  ).toBeVisible();
  await expect(page.getByLabel("E-mailadres")).toBeVisible();
  await expect(page.getByLabel("Wachtwoord")).toBeVisible();
  await expect(page.getByRole("button", { name: "Inloggen", exact: true })).toHaveCount(2);

  expect(
    consoleErrors.filter((message) => !message.includes("favicon.ico"))
  ).toEqual([]);
});

test("protected routes redirect anonymous visitors to login", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/\?redirectedFrom=%2Fdashboard$/);
  await expect(page.getByRole("heading", { name: "Welkom terug" })).toBeVisible();
});

test("internal auth context cannot be supplied by a visitor", async ({
  page,
}) => {
  await page.setExtraHTTPHeaders({
    "x-coachedby-verified-auth-user-id":
      "00000000-0000-4000-8000-000000000001",
  });
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/\?redirectedFrom=%2Fdashboard$/);
  await expect(page.getByRole("heading", { name: "Welkom terug" })).toBeVisible();
});

test("legacy malformed invite links stay on the public origin", async ({
  page,
  baseURL,
}) => {
  const tokenHash = "a".repeat(64);

  await page.goto(`/&token_hash=${tokenHash}&type=invite`);

  await expect(page).toHaveURL(/\/\?error=auth$/);
  expect(new URL(page.url()).origin).toBe(new URL(baseURL!).origin);
  await expect(page.getByRole("heading", { name: "Welkom terug" })).toBeVisible();
});
