import { expect, test } from "@playwright/test";

test.describe("exit warning", () => {
  test("renders the demo dataset on the demo route", async ({ page }) => {
    await page.goto("/demo");

    await expect(page.getByLabel("Project name")).toHaveValue("Release Readiness Tracker");
    await expect(page.getByRole("article", { name: /UR-REL-01/i })).toBeVisible();
    await expect(page.getByRole("article", { name: /SR-WF-01/i })).toBeVisible();
    await expect(page.getByRole("article", { name: /FT-API-01/i })).toBeVisible();
  });

  test("does not show the warning on refresh shortcuts before any changes", async ({ page }) => {
    await page.goto("/");

    await page.keyboard.press("F5");

    await expect(page.getByText("저장하지 않으면 데이터가 삭제됩니다")).toHaveCount(0);
  });

  test("shows the warning for refresh shortcuts after changes and keeps the page state", async ({ page }) => {
    await page.goto("/");

    const projectName = page.getByLabel("Project name");
    await projectName.fill("Refresh Warning Check");

    await page.keyboard.press("Control+R");

    await expect(page.getByText("저장하지 않으면 데이터가 삭제됩니다")).toBeVisible();
    await expect(projectName).toHaveValue("Refresh Warning Check");

    await page.getByRole("button", { name: "닫기" }).click();
    await page.keyboard.press("Meta+R");

    await expect(page.getByText("저장하지 않으면 데이터가 삭제됩니다")).toBeVisible();
  });

  test("does not show the warning immediately when starting a new project", async ({ page }) => {
    await page.goto("/");

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Start new project" }).click();

    await expect(page.getByText("저장하지 않으면 데이터가 삭제됩니다")).toHaveCount(0);
  });
});
