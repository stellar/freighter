// One-off screenshot test for the AddToken SAC disclosure UI.
// Not committed. Run: `npx playwright test screenshot-addtoken-sac --workers=1`.
//
// Drives the popup URL directly to avoid depending on docs.freighter.app's
// playground UI.
import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import { TEST_TOKEN_ADDRESS } from "./helpers/test-token";

const SAC_ISSUER = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ";

const encodeObject = (obj: object) =>
  Buffer.from(
    unescape(encodeURIComponent(JSON.stringify(obj))),
    "binary",
  ).toString("base64");

test("screenshot AddToken SAC disclosure", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: async () => {
      // Force the SAC branch. Register at page-level so we win LIFO ordering
      // against stubAllExternalApis (which sets isSacContract: false).
      await page.route("**/is-sac-contract**", (route) =>
        route.fulfill({ json: { isSacContract: true } }),
      );
      await page.route("**/token-details/**", (route) =>
        route.fulfill({
          json: {
            name: `POC:${SAC_ISSUER}`,
            symbol: "POC",
            decimals: 7,
          },
        }),
      );
    },
  });

  // Drive the popup URL directly with crafted params.
  const tokenInfo = {
    apiVersion: "5.0.0",
    domain: "docs.freighter.app",
    tab: { id: 1, title: "POC dApp", url: "https://docs.freighter.app/" },
    url: "https://docs.freighter.app/",
    contractId: TEST_TOKEN_ADDRESS,
    networkPassphrase: "Test SDF Network ; September 2015",
    uuid: "screenshot-uuid",
  };
  const encoded = encodeObject(tokenInfo);

  await page.goto(
    `chrome-extension://${extensionId}/index.html#/add-token?${encoded}`,
  );

  await expect(page.getByTestId("add-token-issuer-row")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByTestId("add-token-reserve-row")).toBeVisible();
  await expect(page.getByTestId("add-token-fee-row")).toBeVisible();

  // Settle for fee fetch
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: "/tmp/add-token-sac-disclosure.png",
    fullPage: false,
  });

  console.log("Screenshot saved to /tmp/add-token-sac-disclosure.png");
});
