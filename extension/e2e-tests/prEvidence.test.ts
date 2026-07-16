import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import { allowDapp } from "./helpers/dAppSessionHelper";
import { stubAccountBalances } from "./helpers/stubs";

const OUT_DIR = "/Users/piyal/Stellar/freighter/pr-evidence";
const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

const CASES: { file: string; xdr: string }[] = [
  {
    file: "01-setoptions-takeover.png",
    xdr: "AAAAAgAAAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAAAAAAABAAAAAAAAAAEAAAAAAAAAAAAAAAEAAAAABwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcAAAABAAAAAAAAAAA=",
  },
  {
    file: "02-setoptions-lockout.png",
    xdr: "AAAAAgAAAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
  },
  {
    file: "03-setoptions-control-nonzero.png",
    xdr: "AAAAAgAAAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAEAAAACAAAAAAAAAAAAAAABAAAAAwAAAAAAAAAAAAAAAAAAAAA=",
  },
  {
    file: "04-setoptions-setflags-combined.png",
    xdr: "AAAAAgAAAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAABQAAAAAAAAAAAAAAAQAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
  },
  {
    file: "05-setoptions-clearflags-combined.png",
    xdr: "AAAAAgAAAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAABQAAAAAAAAABAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
  },
  {
    file: "06-setoptions-homedomain-clear.png",
    xdr: "AAAAAgAAAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAA==",
  },
  {
    file: "07-settrustlineflags-clear-authorized.png",
    xdr: "AAAAAgAAAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAFQAAAAADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwAAAAFVU0RDAAAAAAkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJAAAAAQAAAAAAAAAAAAAAAA==",
  },
  {
    file: "08-settrustlineflags-set-authorized.png",
    xdr: "AAAAAgAAAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAFQAAAAADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwAAAAFVU0RDAAAAAAkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJAAAAAAAAAAEAAAAAAAAAAA==",
  },
  {
    file: "09-managedata-delete.png",
    xdr: "AAAAAgAAAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAACgAAAAZjb25maWcAAAAAAAAAAAAAAAAAAA==",
  },
  {
    file: "10-managedata-empty-value.png",
    xdr: "AAAAAgAAAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAACgAAAAZjb25maWcAAAAAAAEAAAAAAAAAAAAAAAA=",
  },
];

test("capture signing Details screenshots for PR evidence", async ({
  page,
  extensionId,
  context,
}) => {
  test.setTimeout(300000);

  await loginToTestAccount({ page, extensionId, context });
  await allowDapp({ page });

  for (const { file, xdr } of CASES) {
    const dapp = await context.newPage();
    await dapp.waitForLoadState();

    const popupPromise = context.waitForEvent("page");
    await dapp.goto(
      "https://play.freighter.app/#/extension/playground/signTransaction",
    );
    await dapp.getByRole("textbox").first().fill(xdr);
    await dapp.getByRole("textbox").nth(1).fill(TESTNET_PASSPHRASE);
    await dapp.getByText("Sign Transaction XDR").click();

    const popup = await popupPromise;
    await stubAccountBalances(popup);
    // Keep Blockaid out of the picture so the Details render deterministically.
    await popup.route("**/scan-tx", async (route) => {
      await route.fulfill({
        json: { data: { simulation: { status: "Success" }, validation: null } },
      });
    });

    // Reveal the Details pane (operation-by-operation breakdown).
    await popup.getByText("Transaction details", { exact: true }).click();
    const detailsBody = popup.getByTestId("DetailsBody");
    await expect(detailsBody).toBeVisible({ timeout: 15000 });
    // Let any async rows (identicons) settle.
    await popup.waitForTimeout(500);

    // Element screenshot captures the full operation render (incl. rows below
    // the popup fold) rather than just the visible viewport.
    await detailsBody.screenshot({ path: `${OUT_DIR}/${file}` });

    await popup.close();
    await dapp.close();
  }
});
