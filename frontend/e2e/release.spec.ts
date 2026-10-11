import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test.setTimeout(90_000);

test("Avenoryn registration, private Vault, persistent records, navigation, and user isolation", async ({ page, browser }, testInfo) => {
  const email = `e2e-${randomUUID()}@example.com`;
  const password = "Synthetic-E2E-Password-42!";
  const marker = `avenoryn-e2e-${randomUUID()}`;
  const pdfPath = join(tmpdir(), "avenoryn-e2e.pdf");
  writeFileSync(pdfPath, Buffer.from(`%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n% ${marker}\n%%EOF\n`));

  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const httpErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? "failed"}`));
  page.on("response", (response) => { if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`); });

  await page.goto("/app/vault");
  await expect(page).toHaveURL(/\/login/);
  await page.getByRole("link", { name: "Create one" }).click();
  const emailInput = page.locator('input[name="email"]');
  await emailInput.fill(email);
  await expect(emailInput).toHaveValue(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await expect(emailInput).toHaveValue(email);
  const registrationResponse = page.waitForResponse((response) => response.url().includes("/api/auth/register") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Create account" }).click();
  expect((await registrationResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/app\/home/);
  await expect(page.getByText("Nothing needs attention in this view")).toBeVisible();
  await expect(page.getByText("Avenoryn").first()).toBeVisible();
  await captureVisual(page, testInfo, "home");

  await page.goto("/app/vault");
  await page.getByRole("button", { name: "Add document" }).first().click();
  await page.getByLabel("Title").fill(`${marker} Vault record`);
  await page.getByLabel("File").setInputFiles(pdfPath);
  const uploadResponse = page.waitForResponse((response) => response.url().includes("/api/documents") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  expect((await uploadResponse).ok()).toBeTruthy();
  await expect(page.getByRole("heading", { name: `${marker} Vault record` })).toBeVisible();
  await page.getByRole("button", { name: new RegExp(`${marker} Vault record`) }).click();
  await expect(page.getByRole("button", { name: "Download current" })).toBeVisible();
  await page.getByLabel("New version file").setInputFiles(pdfPath);
  const versionResponse = page.waitForResponse((response) => response.url().includes("/versions") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Upload new version" }).click();
  expect((await versionResponse).ok()).toBeTruthy();
  const documents = await apiDocumentVersions(page.request, marker);
  expect(documents.length).toBe(2);
  const currentDownload = page.waitForResponse((response) => response.url().includes("/download") && response.request().method() === "GET");
  await page.getByRole("button", { name: "Download current" }).click();
  expect((await currentDownload).ok()).toBeTruthy();
  await captureVisual(page, testInfo, "vault");

  const api = page.request;
  const me = await api.get("http://localhost:3002/api/auth/me");
  expect(me.ok()).toBeTruthy();
  const meBody = await me.json();
  const userId = meBody.user.id as string;

  await page.goto("/app/commitments");
  await expect(page.getByRole("heading", { name: "Commitments" })).toBeVisible();
  await page.getByRole("button", { name: "Add subscription" }).click();
  await page.getByLabel("Name").fill(`${marker} subscription`);
  await page.getByLabel("Amount").fill("123.45");
  await page.getByLabel("Billing interval").selectOption("MONTHLY");
  await page.getByLabel("Next billing on").fill(new Date().toISOString().slice(0, 10));
  const subscriptionResponse = page.waitForResponse((response) => response.url().includes("/api/subscriptions") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  expect((await subscriptionResponse).ok()).toBeTruthy();
  await expect(page.getByText(`${marker} subscription`).first()).toBeVisible();

  await page.getByRole("button", { name: "Purchases", exact: true }).click();
  await page.getByRole("button", { name: "Add purchase" }).click();
  await page.getByLabel("Product / item").fill(`${marker} purchase`);
  await page.getByLabel("Purchase date").fill(new Date().toISOString().slice(0, 10));
  await page.getByLabel("Amount").fill("456.78");
  const purchaseResponse = page.waitForResponse((response) => response.url().includes("/api/purchases") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  expect((await purchaseResponse).ok()).toBeTruthy();
  await expect(page.getByText(`${marker} purchase`).first()).toBeVisible();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByLabel("Provider").fill(`${marker} warranty provider`);
  await page.getByLabel("Starts on").fill(new Date().toISOString().slice(0, 10));
  await page.getByLabel("Ends on").fill(`${new Date().getFullYear() + 1}-12-31`);
  const warrantyResponse = page.waitForResponse((response) => response.url().includes("/warranty") && response.request().method() === "PUT");
  await page.getByRole("button", { name: "Save warranty" }).click();
  expect((await warrantyResponse).ok()).toBeTruthy();
  await expect(page.getByText(`${marker} warranty provider`)).toBeVisible();
  await captureVisual(page, testInfo, "commitments-purchases");

  await page.goto("/app/financial");
  await expect(page.getByRole("heading", { name: "Financial commitments" })).toBeVisible();
  await expect(page.getByText(`${marker} subscription`).first()).toBeVisible();
  await captureVisual(page, testInfo, "financial");
  await page.goto("/app/renewals");
  await expect(page.getByRole("heading", { name: "Renewals & deadlines" })).toBeVisible();
  await page.getByRole("button", { name: "Add renewal" }).click();
  await page.getByLabel("Title").fill(`${marker} renewal`);
  await page.getByLabel("Due on").fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const renewalResponse = page.waitForResponse((response) => response.url().includes("/renewals") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  expect((await renewalResponse).ok()).toBeTruthy();
  await expect(page.getByText(`${marker} renewal`).first()).toBeVisible();
  await page.getByRole("button", { name: "Deadlines" }).click();
  await page.getByRole("button", { name: "Add deadline" }).click();
  await page.getByLabel("Title").fill(`${marker} deadline`);
  await page.getByLabel("Due on").fill(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const deadlineResponse = page.waitForResponse((response) => response.url().includes("/deadlines") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  expect((await deadlineResponse).ok()).toBeTruthy();
  await expect(page.getByText(`${marker} deadline`).first()).toBeVisible();
  await captureVisual(page, testInfo, "renewals-deadlines");
  await page.goto("/app/timeline");
  await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
  await captureVisual(page, testInfo, "timeline");
  await page.goto("/app/inbox");
  await expect(page.getByRole("heading", { name: "Life Inbox" })).toBeVisible();
  await page.getByLabel("Title").fill(`${marker} Inbox item`);
  const inboxResponse = page.waitForResponse((response) => response.url().includes("/api/inbox") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Add to Inbox" }).click();
  expect((await inboxResponse).ok()).toBeTruthy();
  await expect(page.getByText(`${marker} Inbox item`).first()).toBeVisible();
  const triageResponse = page.waitForResponse((response) => response.url().includes("/triage") && response.request().method() === "PATCH");
  await page.getByRole("button", { name: "CATEGORIZED", exact: true }).click();
  expect((await triageResponse).ok()).toBeTruthy();
  const inboxAfterTriage = await api.get("http://localhost:3002/api/inbox");
  const triaged = (await inboxAfterTriage.json()).items.find((item: { title: string }) => item.title === `${marker} Inbox item`);
  expect(triaged?.status).toBe("CATEGORIZED");
  await captureVisual(page, testInfo, "life-inbox");
  await page.goto(`/app/search?q=${encodeURIComponent(marker)}`);
  await expect(page.getByText(`${marker} Inbox item`).first()).toBeVisible();
  await captureVisual(page, testInfo, "search");

  await page.getByRole("button", { name: "Notifications" }).click();
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
  await expect(page.getByText(`${marker} deadline`).first()).toBeVisible();
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog", { name: "Command Center" })).toBeVisible();
  await page.keyboard.press("Escape");

  const second = await browser.newContext();
  const otherPage = await second.newPage();
  await otherPage.goto("/register");
  const secondEmail = `e2e-${randomUUID()}@example.com`;
  await otherPage.locator('input[name="email"]').fill(secondEmail);
  await expect(otherPage.locator('input[name="email"]')).toHaveValue(secondEmail);
  await otherPage.getByLabel(/^Password/).fill(password);
  await otherPage.getByLabel("Confirm password").fill(password);
  await otherPage.getByRole("button", { name: "Create account" }).click();
  await expect(otherPage).toHaveURL(/\/app\/home/);
  const otherDocumentsResponse = await otherPage.request.get("http://localhost:3002/api/documents");
  expect(otherDocumentsResponse.ok()).toBeTruthy();
  const otherRows = (await otherDocumentsResponse.json()).documents;
  expect(JSON.stringify(otherRows)).not.toContain(marker);
  const ownDocumentsResponse = await api.get("http://localhost:3002/api/documents");
  expect(ownDocumentsResponse.ok()).toBeTruthy();
  const ownDocument = (await ownDocumentsResponse.json()).documents.find((row: { title: string; id: string }) => row.title.includes(marker));
  expect(ownDocument).toBeTruthy();
  const crossUserDownload = await otherPage.request.get(`http://localhost:3002/api/documents/${ownDocument.id}/download`);
  expect(crossUserDownload.status()).toBe(404);
  const crossUserVersions = await otherPage.request.get(`http://localhost:3002/api/documents/${ownDocument.id}/versions`);
  expect(crossUserVersions.status()).toBe(404);
  await second.close();

  await page.goto("/app/inbox");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Life Inbox" })).toBeVisible();
  const stored = await api.get("http://localhost:3002/api/inbox");
  expect(stored.ok()).toBeTruthy();
  expect(JSON.stringify((await stored.json()).items)).toContain(marker);

  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    userId: document.body.dataset.userId ?? null,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
  expect(userId).toBeTruthy();
  expect(failedRequests).toEqual([]);
  expect(httpErrors.every((error) => error.startsWith("401 ") && error.includes("/api/auth/me"))).toBeTruthy();
  expect(consoleErrors.filter((error) => !error.includes("favicon") && !error.includes("401 (Unauthorized)"))).toEqual([]);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app\/home/);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
});

async function apiDocumentVersions(request: import("@playwright/test").APIRequestContext, marker: string) {
  const response = await request.get("http://localhost:3002/api/documents");
  expect(response.ok()).toBeTruthy();
  const rows = (await response.json()).documents;
  const doc = rows.find((row: { title: string }) => row.title.includes(marker));
  expect(doc).toBeTruthy();
  const versions = await request.get(`http://localhost:3002/api/documents/${doc.id}/versions`);
  expect(versions.ok()).toBeTruthy();
  return ((await versions.json()).versions ?? []) as unknown[];
}

async function captureVisual(page: import("@playwright/test").Page, testInfo: import("@playwright/test").TestInfo, name: string) {
  const widths = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
  expect(widths.page, `${name} has horizontal overflow`).toBeLessThanOrEqual(widths.viewport + 1);
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
}
