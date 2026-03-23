import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import {
  injectMaintenanceScreenState,
  injectMaintenanceBannerState,
} from "./helpers/stubs";

// loginToTestAccount performs wallet import + network switching which typically
// takes 20–40 s even with all external APIs stubbed. The default 15 s timeout
// is too short; apply a 2-minute budget to every test in this file.
test.describe.configure({ timeout: 120_000 });

// ---------------------------------------------------------------------------
// MaintenanceScreen — full-screen blocking overlay
// ---------------------------------------------------------------------------

test("MaintenanceScreen shows overlay with title and body from payload", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context });

  await injectMaintenanceScreenState(page, {
    title: "Maintenance in progress",
    body: ["We'll be back soon.", "Thank you for your patience."],
  });

  await expect(page.getByTestId("maintenance-screen")).toBeVisible();
  await expect(page.getByText("Maintenance in progress")).toBeVisible();
  await expect(page.getByText("We'll be back soon.")).toBeVisible();
  await expect(page.getByText("Thank you for your patience.")).toBeVisible();
});

test("MaintenanceScreen renders no body section when body array is empty", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context });

  await injectMaintenanceScreenState(page, {
    title: "Down for maintenance",
    body: [],
  });

  await expect(page.getByTestId("maintenance-screen")).toBeVisible();
  await expect(page.getByText("Down for maintenance")).toBeVisible();
  await expect(page.locator(".MaintenanceScreen__body")).not.toBeVisible();
});

test("MaintenanceScreen overlay intercepts clicks on underlying UI", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context });

  // Confirm baseline — dropdown works before the overlay is active
  await expect(page.getByTestId("account-view")).toBeVisible();

  await injectMaintenanceScreenState(page, {
    title: "Maintenance",
    body: ["Back soon."],
  });

  await expect(page.getByTestId("maintenance-screen")).toBeVisible();

  // The fixed overlay (z-index: 9999) sits above the account UI; Playwright's
  // click uses elementFromPoint() which respects z-index, so this should throw.
  await expect(async () => {
    await page.getByTestId("account-options-dropdown").click({ timeout: 2000 });
  }).rejects.toThrow();
});

// ---------------------------------------------------------------------------
// MaintenanceBanner — non-blocking notification on the Account view
// ---------------------------------------------------------------------------

test("MaintenanceBanner appears on the Account view", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context });

  await injectMaintenanceBannerState(page, {
    theme: "warning",
    bannerTitle: "Services degraded",
  });

  await expect(page.getByTestId("maintenance-banner")).toBeVisible();
  await expect(page.getByText("Services degraded")).toBeVisible();
});

test("MaintenanceBanner — warning theme applies warning variant", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context });

  await injectMaintenanceBannerState(page, {
    theme: "warning",
    bannerTitle: "Warning banner",
  });

  await expect(page.getByTestId("maintenance-banner")).toBeVisible();
  await expect(
    page.getByTestId("maintenance-banner").locator(".Notification--warning"),
  ).toBeVisible();
});

test("MaintenanceBanner — error theme applies error variant", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context });

  await injectMaintenanceBannerState(page, {
    theme: "error",
    bannerTitle: "Error banner",
  });

  await expect(page.getByTestId("maintenance-banner")).toBeVisible();
  await expect(
    page.getByTestId("maintenance-banner").locator(".Notification--error"),
  ).toBeVisible();
});

test("MaintenanceBanner — primary theme applies primary variant", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context });

  await injectMaintenanceBannerState(page, {
    theme: "primary",
    bannerTitle: "Primary banner",
  });

  await expect(page.getByTestId("maintenance-banner")).toBeVisible();
  await expect(
    page.getByTestId("maintenance-banner").locator(".Notification--primary"),
  ).toBeVisible();
});

test("MaintenanceBanner — secondary theme applies secondary variant", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context });

  await injectMaintenanceBannerState(page, {
    theme: "secondary",
    bannerTitle: "Secondary banner",
  });

  await expect(page.getByTestId("maintenance-banner")).toBeVisible();
  await expect(
    page.getByTestId("maintenance-banner").locator(".Notification--secondary"),
  ).toBeVisible();
});

test("MaintenanceBanner — tertiary theme maps to primary variant", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context });

  await injectMaintenanceBannerState(page, {
    theme: "tertiary",
    bannerTitle: "Tertiary banner",
  });

  await expect(page.getByTestId("maintenance-banner")).toBeVisible();
  // tertiary has no SDS equivalent — mapThemeToVariant() falls back to "primary"
  await expect(
    page.getByTestId("maintenance-banner").locator(".Notification--primary"),
  ).toBeVisible();
});

test("MaintenanceBanner — clicking banner with URL opens external link", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context });

  await injectMaintenanceBannerState(page, {
    theme: "warning",
    bannerTitle: "Network degraded",
    url: "https://status.stellar.org",
  });

  await expect(page.getByTestId("maintenance-banner")).toBeVisible();

  const popupPromise = page.context().waitForEvent("page");
  await page.getByTestId("maintenance-banner").click();
  const popup = await popupPromise;

  await expect(popup).toHaveURL(/status\.stellar\.org/);
});

test("MaintenanceBanner — clicking banner with modal opens the detail sheet", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context });

  await injectMaintenanceBannerState(page, {
    theme: "warning",
    bannerTitle: "Scheduled maintenance",
    modal: {
      title: "Maintenance details",
      body: ["We will be down from 2–4 UTC.", "Please save your work."],
    },
  });

  await expect(page.getByTestId("maintenance-banner")).toBeVisible();

  // Modal is not yet open
  await expect(page.getByTestId("maintenance-banner-modal")).not.toBeVisible();

  await page.getByTestId("maintenance-banner").click();

  // Modal should now be open and contain the payload content
  await expect(page.getByTestId("maintenance-banner-modal")).toBeVisible();
  await expect(page.getByText("Maintenance details")).toBeVisible();
  await expect(page.getByText("We will be down from 2–4 UTC.")).toBeVisible();
  await expect(page.getByText("Please save your work.")).toBeVisible();
});

test("MaintenanceBanner — Close button dismisses the detail modal", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context });

  await injectMaintenanceBannerState(page, {
    theme: "primary",
    bannerTitle: "Upcoming outage",
    modal: {
      title: "Outage window",
      body: ["Maintenance starts at 00:00 UTC."],
    },
  });

  await page.getByTestId("maintenance-banner").click();
  await expect(page.getByTestId("maintenance-banner-modal")).toBeVisible();

  // The "Close" button inside the modal should dismiss it
  await page
    .getByTestId("maintenance-banner-modal")
    .getByRole("button", { name: "Close" })
    .click();

  await expect(page.getByTestId("maintenance-banner-modal")).not.toBeVisible();
});
