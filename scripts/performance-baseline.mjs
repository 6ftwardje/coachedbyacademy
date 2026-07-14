import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const baseURL = (
  process.env.E2E_BASE_URL ?? "https://coachedbycourse.netlify.app"
).replace(/\/$/, "");
const runs = Math.max(1, Number.parseInt(process.env.PERF_RUNS ?? "5", 10));
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

function percentile(values, fraction) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * fraction) - 1];
}

function summarize(measurements) {
  const fields = [
    "ttfbMs",
    "fcpMs",
    "lcpMs",
    "domContentLoadedMs",
    "loadMs",
    "transferKb",
    "jsTransferKb",
    "requestCount",
  ];

  return Object.fromEntries(
    fields.map((field) => {
      const values = measurements
        .map((measurement) => measurement[field])
        .filter((value) => Number.isFinite(value));
      return [
        field,
        {
          p50: percentile(values, 0.5),
          p95: percentile(values, 0.95),
        },
      ];
    })
  );
}

async function installObservers(page) {
  await page.addInitScript(() => {
    window.__projectSpeed = { lcp: 0, cls: 0, longTaskMs: 0 };

    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const latest = entries.at(-1);
      if (latest) window.__projectSpeed.lcp = latest.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__projectSpeed.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__projectSpeed.longTaskMs += entry.duration;
      }
    }).observe({ type: "longtask", buffered: true });
  });
}

async function login(page) {
  if (!email || !password) return false;

  await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("E-mailadres").fill(email);
  await page.getByLabel("Wachtwoord").fill(password);
  await page.getByRole("button", { name: "Inloggen", exact: true }).last().click();
  await page.waitForURL(/\/dashboard$/, { timeout: 30_000 });
  return true;
}

async function discoverStudentRoutes(page) {
  const routes = ["/dashboard", "/modules", "/account"];
  await page.goto(`${baseURL}/modules`, { waitUntil: "domcontentloaded" });

  const moduleHref = await page
    .locator('a[href^="/modules/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
  if (!moduleHref) return routes;

  routes.push(moduleHref);
  await page.goto(`${baseURL}${moduleHref}`, { waitUntil: "domcontentloaded" });
  const lessonHref = await page
    .locator('a[href^="/lessons/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
  if (lessonHref) routes.push(lessonHref);

  return routes;
}

async function measure(page, route) {
  const consoleErrors = [];
  const onConsole = (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  };
  page.on("console", onConsole);

  await page.goto(`${baseURL}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load");
  await page.waitForTimeout(1_000);

  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource");
    const firstContentfulPaint = performance
      .getEntriesByName("first-contentful-paint")
      .at(0);
    const totalTransfer = resources.reduce(
      (total, resource) => total + (resource.transferSize ?? 0),
      navigation.transferSize ?? 0
    );
    const jsTransfer = resources
      .filter(
        (resource) =>
          resource.initiatorType === "script" || resource.name.includes("/_next/static/chunks/")
      )
      .reduce((total, resource) => total + (resource.transferSize ?? 0), 0);

    return {
      ttfbMs: Math.round(navigation.responseStart * 10) / 10,
      fcpMs: firstContentfulPaint
        ? Math.round(firstContentfulPaint.startTime * 10) / 10
        : null,
      lcpMs: Math.round(window.__projectSpeed.lcp * 10) / 10,
      cls: Math.round(window.__projectSpeed.cls * 1_000) / 1_000,
      longTaskMs: Math.round(window.__projectSpeed.longTaskMs * 10) / 10,
      domContentLoadedMs:
        Math.round(navigation.domContentLoadedEventEnd * 10) / 10,
      loadMs: Math.round(navigation.loadEventEnd * 10) / 10,
      transferKb: Math.round((totalTransfer / 1024) * 10) / 10,
      jsTransferKb: Math.round((jsTransfer / 1024) * 10) / 10,
      requestCount: resources.length + 1,
    };
  });

  page.off("console", onConsole);
  return { ...metrics, consoleErrors };
}

const browser = await chromium.launch();

try {
  const setupContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const setupPage = await setupContext.newPage();
  const authenticated = await login(setupPage);
  const routes = authenticated
    ? await discoverStudentRoutes(setupPage)
    : ["/"];
  const storageState = authenticated
    ? await setupContext.storageState()
    : undefined;
  await setupContext.close();
  const results = {};

  for (const route of [...new Set(routes)]) {
    const measurements = [];
    for (let run = 0; run < runs; run += 1) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        storageState,
      });
      const page = await context.newPage();
      await installObservers(page);
      measurements.push(await measure(page, route));
      await context.close();
    }
    results[route] = {
      measurements,
      summary: summarize(measurements),
    };
  }

  const generatedAt = new Date().toISOString();
  const report = {
    project: "Project Speed",
    generatedAt,
    baseURL,
    authenticated,
    runsPerRoute: runs,
    environment: {
      node: process.version,
      viewport: "1440x1000",
    },
    routes: results,
  };
  const outputDir = path.resolve("output/performance");
  const outputPath = path.join(
    outputDir,
    `baseline-${generatedAt.replace(/[:.]/g, "-")}.json`
  );
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);

  console.info(JSON.stringify(report, null, 2));
  console.info(`\nBaseline written to ${outputPath}`);
} finally {
  await browser.close();
}
