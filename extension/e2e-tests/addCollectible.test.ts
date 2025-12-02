import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import {
  stubAccountBalances,
  stubAccountHistory,
  stubScanDapp,
  stubTokenDetails,
  stubTokenPrices,
  stubCollectibles,
} from "./helpers/stubs";

test("Add a collectible to an account", async ({
  page,
  extensionId,
  context,
}) => {
  let collectiblesParams = {
    owner: "",
    contracts: [] as { id: string; token_ids: string[] }[],
  };
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);
  await stubCollectibles(page);

  await page.route("**/collectibles**", async (route) => {
    const postData = JSON.parse(route.request().postData() || "{}");
    const { owner, contracts } = postData as {
      owner: string;
      contracts: { id: string; token_ids: string[] }[];
    };

    if (owner && contracts.length > 0) {
      collectiblesParams = {
        owner,
        contracts,
      };
    }

    const json = {
      data: {
        collections: [
          // Stellar Frogs Collection
          {
            collection: {
              address:
                "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA", // Using XLM contract address for testing
              name: "Stellar Frogs",
              symbol: "SFROG",
              collectibles: [
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "1",
                  token_uri: "https://nftcalendar.io/tokenMetadata/1",
                },
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "2",
                  token_uri: "https://nftcalendar.io/tokenMetadata/2",
                },
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "3",
                  token_uri: "https://nftcalendar.io/tokenMetadata/3",
                },
              ],
            },
          },
          // Soroban Domains Collection
          {
            collection: {
              address: "CCCSorobanDomainsCollection",
              name: "Soroban Domains",
              symbol: "SDOM",
              collectibles: [
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "102510",
                  token_uri: "https://nftcalendar.io/tokenMetadata/102510",
                },
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "102589",
                  token_uri: "https://nftcalendar.io/tokenMetadata/102589",
                },
              ],
            },
          },
          // Future Monkeys Collection
          {
            collection: {
              address: "CCCFutureMonkeysCollection",
              name: "Future Monkeys",
              symbol: "FMONK",
              collectibles: [
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "111",
                  token_uri: "https://nftcalendar.io/tokenMetadata/111",
                },
              ],
            },
          },
        ],
      },
    };
    await route.fulfill({ json });
  });

  test.slow();
  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("network-selector-open").click();
  await page.getByText("Main Net").click();

  // add the collectible
  await expect(page.getByTestId("account-view")).toBeVisible();
  await page.getByTestId("account-tab-collectibles").click();
  await page.getByTestId("account-tabs-manage-btn-collectibles").click();
  await page.getByText("Add manually").click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toHaveText(
    "Add Collectible",
  );
  await page
    .getByTestId("collectibleAddress")
    .fill("CCTYMI5ME6NFJC675P2CHNVG467YQJQ5E4TWP5RAPYYNKWK7DIUUDENN");
  await page.getByTestId("collectibleTokenId").fill("1");

  await page.getByTestId("ManageCollectibles__button").click();

  // now check that the collectible is added
  await expect(page.getByText("Stellar Frogs")).toBeVisible();
  await expect(page.getByText("Soroban Domains")).toBeVisible();
  await expect(page.getByText("Future Monkeys")).toBeVisible();

  // confirm that we called for the correct collectible
  expect(collectiblesParams.contracts).toHaveLength(1);
  expect(collectiblesParams.contracts[0].id).toBe(
    "CCTYMI5ME6NFJC675P2CHNVG467YQJQ5E4TWP5RAPYYNKWK7DIUUDENN",
  );
  expect(collectiblesParams.contracts[0].token_ids).toHaveLength(1);
  expect(collectiblesParams.contracts[0].token_ids[0]).toBe("1");
});
