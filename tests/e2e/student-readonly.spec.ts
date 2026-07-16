import { expect, test } from "@playwright/test";

function isMuxMediaRequest(url: string) {
  return (
    url.includes("stream.mux.com") ||
    url.includes("muxed.dev") ||
    url.includes("media-delivery.net")
  );
}

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

test("lesson defers Mux media until the student starts the video", async ({
  page,
}) => {
  await page.goto("/modules");
  await page.locator('a[href^="/modules/"]').first().click();
  await page.locator('a[href^="/lessons/"]').first().click();

  const playLesson = page.getByRole("button", { name: /^Speel .+/ });
  await expect(playLesson).toBeVisible();

  const resourcesBeforePlay = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((entry) => entry.name)
  );
  expect(resourcesBeforePlay.filter(isMuxMediaRequest)).toEqual([]);

  await playLesson.click();
  await expect
    .poll(async () => {
      const resources = await page.evaluate(() =>
        performance.getEntriesByType("resource").map((entry) => entry.name)
      );
      return resources.filter(isMuxMediaRequest).length;
    })
    .toBeGreaterThan(0);
});

test("dashboard defers Mux media until the student starts the intro", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dashboard");

  const playIntro = page.getByRole("button", {
    name: "Speel Introductie tot Coachedby Mentorship",
  });
  await expect(playIntro).toBeVisible();

  const resourcesBeforePlay = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((entry) => entry.name)
  );
  expect(resourcesBeforePlay.filter(isMuxMediaRequest)).toEqual([]);

  await playIntro.click();
  await expect
    .poll(async () => {
      const resources = await page.evaluate(() =>
        performance.getEntriesByType("resource").map((entry) => entry.name)
      );
      return resources.filter(isMuxMediaRequest).length;
    })
    .toBeGreaterThan(0);
});
