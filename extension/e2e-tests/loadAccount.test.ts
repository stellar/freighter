import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginToTestAccount, PASSWORD } from "./helpers/login";
import {
  stubAccountBalances,
  stubAccountHistory,
  stubScanDapp,
  stubTokenDetails,
  stubTokenPrices,
} from "./helpers/stubs";

test("Load accounts on standalone network", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  test.slow();
  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Settings").click();
  await page.getByText("Network").click();
  await page.getByText("Add custom network").click();
  await expect(page.getByText("Add Custom Network")).toBeVisible();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "network-form-page.png",
  });
  await page.getByTestId("NetworkForm__networkName").fill("test standalone");
  await page
    .getByTestId("NetworkForm__networkUrl")
    .fill("https://horizon-testnet.stellar.org");
  await page
    .getByTestId("NetworkForm__sorobanRpcUrl")
    .fill("https://soroban-testnet.stellar.org/");
  await page
    .getByTestId("NetworkForm__networkPassphrase")
    .fill("Test SDF Network ; September 2015");
  await page.getByTestId("NetworkForm__add").click();
  await page.getByTestId("BackButton").click();
  await page.getByTestId("BackButton").click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByTestId("account-assets")).toContainText("XLM");
});

test("Switches account and fetches correct balances while clearing cache", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  test.slow();
  await loginToTestAccount({ page, extensionId });
  await expect(page.getByTestId("account-assets")).toContainText("XLM");
  const account1XlmBalance = await page
    .getByTestId("asset-amount")
    .textContent();

  await page.getByTestId("account-view-account-name").click();
  await page.getByText("Account 2").click();

  const account2XlmBalance = await page
    .getByTestId("asset-amount")
    .textContent();

  await expect(account1XlmBalance).not.toEqual(account2XlmBalance);

  // go back to account 1 and make sure we do a fresh balance fetch
  await page.route("**/account-balances/**", async (route) => {
    const json = {
      balances: {
        native: {
          token: {
            type: "native",
            code: "XLM",
          },
          total: "999111",
          available: "99911",
          sellingLiabilities: "0",
          buyingLiabilities: "0",
          minimumBalance: "1",
          blockaidData: {
            result_type: "Benign",
            malicious_score: "0.0",
            attack_types: {},
            chain: "stellar",
            address: "",
            metadata: {
              type: "",
            },
            fees: {},
            features: [],
            trading_limits: {},
            financial_stats: {},
          },
        },
      },
      isFunded: true,
      subentryCount: 0,
      error: {
        horizon: null,
        soroban: null,
      },
    };

    await route.fulfill({ json });
  });

  await page.getByTestId("account-view-account-name").click();
  await page.getByText("Account 1").click();
  const updatedAccount1XlmBalance = await page
    .getByTestId("asset-amount")
    .textContent();
  await expect(updatedAccount1XlmBalance).not.toEqual(account1XlmBalance);
  await expect(updatedAccount1XlmBalance).toEqual("999,111");
});

test("Switches network and fetches correct balances while clearing cache", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  await page.route("**/account-balances/**", async (route) => {
    let json = {};

    if (route.request().url().includes("TESTNET")) {
      json = {
        balances: {
          native: {
            token: {
              type: "native",
              code: "XLM",
            },
            total: "2",
            available: "2",
            sellingLiabilities: "0",
            buyingLiabilities: "0",
            minimumBalance: "1",
            blockaidData: {
              result_type: "Benign",
              malicious_score: "0.0",
              attack_types: {},
              chain: "stellar",
              address: "",
              metadata: {
                type: "",
              },
              fees: {},
              features: [],
              trading_limits: {},
              financial_stats: {},
            },
          },
        },
        isFunded: true,
        subentryCount: 0,
        error: {
          horizon: null,
          soroban: null,
        },
      };
    } else {
      json = {
        balances: {
          native: {
            token: {
              type: "native",
              code: "XLM",
            },
            total: "1",
            available: "1",
            sellingLiabilities: "0",
            buyingLiabilities: "0",
            minimumBalance: "1",
            blockaidData: {
              result_type: "Benign",
              malicious_score: "0.0",
              attack_types: {},
              chain: "stellar",
              address: "",
              metadata: {
                type: "",
              },
              fees: {},
              features: [],
              trading_limits: {},
              financial_stats: {},
            },
          },
        },
        isFunded: true,
        subentryCount: 0,
        error: {
          horizon: null,
          soroban: null,
        },
      };
    }

    await route.fulfill({ json });
  });

  test.slow();
  await loginToTestAccount({ page, extensionId });
  await expect(page.getByTestId("account-assets")).toContainText("XLM");
  await expect(page.getByTestId("asset-amount")).toHaveText("2");

  await page.getByTestId("network-selector-open").click();
  await page.getByText("Main Net").click();

  await expect(page.getByTestId("asset-amount")).toHaveText("1");

  // now go back to Testnet and make sure we do a fresh balance fetch
  await page.route("**/account-balances/**", async (route) => {
    const json = {
      balances: {
        native: {
          token: {
            type: "native",
            code: "XLM",
          },
          total: "999111",
          available: "99911",
          sellingLiabilities: "0",
          buyingLiabilities: "0",
          minimumBalance: "1",
          blockaidData: {
            result_type: "Benign",
            malicious_score: "0.0",
            attack_types: {},
            chain: "stellar",
            address: "",
            metadata: {
              type: "",
            },
            fees: {},
            features: [],
            trading_limits: {},
            financial_stats: {},
          },
        },
      },
      isFunded: true,
      subentryCount: 0,
      error: {
        horizon: null,
        soroban: null,
      },
    };

    await route.fulfill({ json });
  });
  await page.getByTestId("network-selector-open").click();
  await page.getByText("Test Net").click();
  await expect(page.getByTestId("asset-amount")).toHaveText("999,111");
});

test("Account Balances should be loaded once and cached", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  test.slow();
  await loginToTestAccount({ page, extensionId });

  let accountBalancesRequestWasMade = false;
  page.on("request", (request) => {
    if (request.url().includes("/account-balances/")) {
      accountBalancesRequestWasMade = true;
    }
  });

  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Settings").click();
  await page.getByTestId("BackButton").click();
  await expect(accountBalancesRequestWasMade).toBeFalsy();
});

test("Switches account without password prompt", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  test.slow();
  await loginToTestAccount({ page, extensionId });
  await expect(page.getByTestId("account-assets")).toContainText("XLM");
  await page.getByTestId("account-view-account-name").click();
  await page.getByText("Account 2").click();

  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Manage assets").click();

  await expect(page.getByText("Your assets")).toBeVisible();
});

test("Can't change settings on a stale window", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(context);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  test.slow();

  const pageOne = await page.context().newPage();
  await loginToTestAccount({ page: pageOne, extensionId });

  // open a second tab and change the account
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();
  await stubTokenDetails(context);
  await stubAccountBalances(pageTwo);
  await stubAccountHistory(pageTwo);
  await stubTokenPrices(pageTwo);
  await stubScanDapp(context);

  await pageTwo.goto(`chrome-extension://${extensionId}/index.html`);
  await expect(pageTwo.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  await pageTwo.getByTestId("account-view-account-name").click();
  await pageTwo.getByText("Account 2").click();
  await expect(pageTwo.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

  await expect(pageTwo.getByTestId("account-options-dropdown")).toBeVisible({
    timeout: 30000,
  });
  // go back to the first tab (still on the old account) and try to change a setting
  await pageOne.getByTestId("account-options-dropdown").click();
  await pageOne.getByText("Settings").click();
  await pageOne.getByText("Preferences").click();
  await expect(pageOne.locator("#isValidatingMemoValue")).toHaveValue("true");
  await pageOne.getByTestId("isValidatingMemoValue").click();
  await expect(pageOne.getByTestId("account-mismatch")).toBeVisible();

  // go back to the second tab and confirm the setting didn't change
  await pageTwo.getByTestId("account-options-dropdown").click();
  await pageTwo.getByText("Settings").click();
  await pageTwo.getByText("Preferences").click();
  await expect(pageTwo.locator("#isValidatingMemoValue")).toHaveValue("true");
});

test.skip("Clears cache and fetches balances if it's been 2 minutes since the last balance update", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  test.slow();
  await page.clock.install({ time: new Date("2024-01-01T12:00:00") });
  await loginToTestAccount({ page, extensionId });
  await expect(page.getByTestId("account-assets")).toContainText("XLM");
  const account1XlmBalance = await page
    .getByTestId("asset-amount")
    .textContent();

  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Settings").click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toHaveText("Settings");

  // go back to account 1 and make sure we do a fresh balance fetch
  await page.route("**/account-balances/**", async (route) => {
    const json = {
      balances: {
        native: {
          token: {
            type: "native",
            code: "XLM",
          },
          total: "999111",
          available: "99911",
          sellingLiabilities: "0",
          buyingLiabilities: "0",
          minimumBalance: "1",
          blockaidData: {
            result_type: "Benign",
            malicious_score: "0.0",
            attack_types: {},
            chain: "stellar",
            address: "",
            metadata: {
              type: "",
            },
            fees: {},
            features: [],
            trading_limits: {},
            financial_stats: {},
          },
        },
      },
      isFunded: true,
      subentryCount: 0,
      error: {
        horizon: null,
        soroban: null,
      },
    };

    await route.fulfill({ json });
  });

  // test 1 minute
  await page.clock.fastForward("01:00");

  await page.getByTestId("BackButton").click();
  const updatedAccount1XlmBalance1minute = await page
    .getByTestId("asset-amount")
    .textContent();
  await expect(updatedAccount1XlmBalance1minute).toEqual(account1XlmBalance);

  // go back and wait another 2 minutes
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Settings").click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toHaveText("Settings");
  await page.clock.fastForward("02:00");
  await page.getByTestId("BackButton").click();

  // make sure we fetch the new balance quickly rather than waiting for the 30 second interval
  await expect(page.getByTestId("asset-amount")).toHaveText("999,111", {
    timeout: 3000,
  });
});

test("Loads wallets data and token prices on Mainnet in batches", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  let tokenPricesCallCount = 0;

  page.on("request", (request) => {
    if (request.url().includes("/token-prices")) {
      tokenPricesCallCount++;
    }
  });

  await page.route("**/account-balances/**", async (route) => {
    const json = {
      balances: {
        native: {
          token: {
            type: "native",
            code: "XLM",
          },
          total: "5",
          available: "4",
          sellingLiabilities: "0",
          buyingLiabilities: "0",
          minimumBalance: "1",
          blockaidData: {
            result_type: "Benign",
            malicious_score: "0.0",
            attack_types: {},
            chain: "stellar",
            address: "",
            metadata: {
              type: "",
            },
            fees: {},
            features: [],
            trading_limits: {},
            financial_stats: {},
          },
        },
        "BTC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM": {
          token: {
            code: "BTC",
            issuer: {
              key: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
            },
          },
          symbol: "BTC",
          total: "3",
          available: "100000099976",
          blockaidData: {
            result_type: "Benign",
            malicious_score: "0.0",
            attack_types: {},
            chain: "stellar",
            address: "",
            metadata: {
              type: "",
            },
            fees: {},
            features: [],
            trading_limits: {},
            financial_stats: {},
          },
        },
      },
      isFunded: true,
      subentryCount: 0,
      error: {
        horizon: null,
        soroban: null,
      },
    } as any;
    if (
      route
        .request()
        .url()
        .includes("GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY")
    ) {
      json.balances.native.total = "10";
      json.balances.native.available = "9";
      json.balances[
        "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM"
      ] = {
        token: {
          code: "USDC",
          issuer: {
            key: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
          },
        },
        symbol: "USDC",
        total: "3",
        available: "100000099976",
        blockaidData: {
          result_type: "Benign",
          malicious_score: "0.0",
          attack_types: {},
          chain: "stellar",
          address: "",
          metadata: {
            type: "",
          },
          fees: {},
          features: [],
          trading_limits: {},
          financial_stats: {},
        },
      };
    }
    if (
      route
        .request()
        .url()
        .includes("GCKUVXILBNYS4FDNWCGCYSJBY2PBQ4KAW2M5CODRVJPUFM62IJFH67J2")
    ) {
      json.balances.native.total = "11";
      json.balances.native.available = "10";
    }
    if (
      route
        .request()
        .url()
        .includes("GDPXC35MQCSFJCEDNWUJZYDJWKNGNL2YMFZZS47LT46CFVGAJ6GWYGJC")
    ) {
      json.balances.native.total = "12";
      json.balances.native.available = "11";
    }
    if (
      route
        .request()
        .url()
        .includes("GC32JSRAZA6BJYIKEI2X5LAVJKFVDVVIYWRVCAI7Q7N36WKXVDHTGTQA")
    ) {
      json.balances.native.total = "13";
      json.balances.native.available = "9";
    }
    if (
      route
        .request()
        .url()
        .includes("GDY4ZZLCUEBZPHTKSAESUHV37JA5MZ7BGP2KS32DSBSHS7ONSBFZBQ7C")
    ) {
      json.balances.native.total = "14";
      json.balances.native.available = "9";
    }
    if (
      route
        .request()
        .url()
        .includes("GBW2O3KT5E6W6XN2T66X5TM6EXVTTKVHQJE426PUX5ANMGQVLS2KOU3T")
    ) {
      json.balances.native.total = "15";
      json.balances.native.available = "9";
    }
    if (
      route
        .request()
        .url()
        .includes("GARHHLBEZLF3WWIENRZLHKOB62IIDZX2DHNWXAR2E7KVQTDQGDI4H6NU")
    ) {
      json.balances.native.total = "16";
      json.balances.native.available = "9";
    }
    await route.fulfill({ json });
  });

  test.slow();
  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("network-selector-open").click();
  await page.getByText("Main Net").click();
  await expect(page.getByTestId("account-assets")).toContainText("XLM");
  await page.getByTestId("account-view-account-name").click();
  await expect(page.getByText("Wallets")).toBeVisible();

  await page.getByText("Add a wallet").click();
  await page.getByText("Create new wallet").click();
  await page.locator("#password-input").fill(PASSWORD);
  await page.getByRole("button", { name: "Create New Address" }).click();
  await expect(page.getByTestId("account-assets")).toContainText("XLM");

  await page.getByTestId("account-view-account-name").click();
  await expect(page.getByText("Wallets")).toBeVisible();

  await expect(page.getByText("GDF3…ZEFY - $6.52")).toBeVisible();
  await expect(page.getByText("GCKU…67J2 - $5.71")).toBeVisible();
  await expect(page.getByText("GDPX…YGJC - $6.11")).toBeVisible();
  await expect(page.getByText("GC32…GTQA - $6.52")).toBeVisible();
  await expect(page.getByText("GDY4…BQ7C - $6.93")).toBeVisible();
  await expect(page.getByText("GBW2…OU3T - $7.34")).toBeVisible();
  await expect(page.getByText("GARH…H6NU - $7.75")).toBeVisible();

  expect(tokenPricesCallCount).toBe(7);
});

test("Renames wallets", async ({ page, extensionId, context }) => {
  await stubTokenDetails(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("account-view-account-name").click();
  await expect(page.getByText("Wallets")).toBeVisible();

  const walletRowOptions = await page.getByTestId("wallet-row-options").all();
  await walletRowOptions[0].click();
  await page.getByText("Rename wallet").click();
  await page.getByTestId("rename-wallet-input").fill("New Wallet");
  await page.getByText("Save").click();
  await expect(page.getByText("New Wallet")).toBeVisible();
});
