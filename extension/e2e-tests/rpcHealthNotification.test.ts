import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import {
  stubAccountBalances,
  stubAccountHistory,
  stubScanDapp,
  stubTokenDetails,
  stubTokenPrices,
} from "./helpers/stubs";

test("RPC health notification appears when RPC health is unhealthy", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  // Stub the RPC health endpoint to return unhealthy status
  await context.route("**/ping?network=*", async (route) => {
    await route.abort("blockedbyclient");
  });

  test.slow();
  await loginToTestAccount({ page, extensionId });

  // Wait for the account view to load
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

  // Check if the Soroban RPC issue notification appears
  await expect(page.getByTestId("account-view-sorban-rpc-issue")).toBeVisible();

  // Verify the notification has the correct text
  await expect(
    page.getByText("Soroban RPC is temporarily experiencing issues"),
  ).toBeVisible();

  await expect(
    page.getByText("Some features may be disabled at this time"),
  ).toBeVisible();
});
