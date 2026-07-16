import {
  TransactionBuilder,
  Account,
  Operation,
  Asset,
  Networks,
  Keypair,
  Claimant,
} from "stellar-sdk";

import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import { allowDapp } from "./helpers/dAppSessionHelper";
import { stubAccountBalances } from "./helpers/stubs";

// Evidence capture for stellar/freighter#2882 — show asset issuer for
// value-bearing operations in the signing Details view (HackerOne #3768317).
// Drives the real extension through the playground signTransaction flow and
// screenshots the Transaction Details body for each value-bearing op.

const OUT_DIR = "/Users/piyal/Stellar/freighter/pr-evidence/asset-issuer";
const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

// Fixed, valid issuers so the truncated UI form (first4…last4) is reproducible
// and verifiable in the screenshots.
const USDC_LEGIT = "GBPL3XT5I5R4K5PZ4T46XCPODGKXSM6W43Q5PVEI36XRJF525JLNB6D7"; // GBPL…B6D7
const USDC_FAKE = "GBK2KHDOAGEOAQ7SXTKZWTUPB27SH44L2N5SANJO3GIKLX7ZIZHNIP4W"; // GBK2…IP4W
const EURT = "GAR2BQ7YWM5ZGVVAIPNLLBWDVALTN5ILTSKQUEOXD5BZVNCRGUBNYDW6"; // GAR2…YDW6

const SOURCE = Keypair.random().publicKey();
const DEST = Keypair.random().publicKey();

const usdcLegit = new Asset("USDC", USDC_LEGIT);
const usdcFake = new Asset("USDC", USDC_FAKE);
const eurt = new Asset("EURT", EURT);

const buildXdr = (op: ReturnType<typeof Operation.payment>) =>
  new TransactionBuilder(new Account(SOURCE, "123456789"), {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(op)
    .setTimeout(0)
    .build()
    .toXDR();

const CASES: { file: string; xdr: string }[] = [
  {
    file: "01-payment-usdc-legit.png",
    xdr: buildXdr(
      Operation.payment({ destination: DEST, asset: usdcLegit, amount: "100" }),
    ),
  },
  {
    file: "02-payment-native-xlm.png",
    xdr: buildXdr(
      Operation.payment({
        destination: DEST,
        asset: Asset.native(),
        amount: "100",
      }),
    ),
  },
  {
    file: "03-payment-usdc-lookalike.png",
    xdr: buildXdr(
      Operation.payment({ destination: DEST, asset: usdcFake, amount: "100" }),
    ),
  },
  {
    file: "04-pathpaymentstrictsend.png",
    xdr: buildXdr(
      Operation.pathPaymentStrictSend({
        sendAsset: usdcLegit,
        sendAmount: "100",
        destination: DEST,
        destAsset: eurt,
        destMin: "90",
        path: [],
      }),
    ),
  },
  {
    file: "05-pathpaymentstrictreceive.png",
    xdr: buildXdr(
      Operation.pathPaymentStrictReceive({
        sendAsset: usdcLegit,
        sendMax: "110",
        destination: DEST,
        destAsset: eurt,
        destAmount: "100",
        path: [],
      }),
    ),
  },
  {
    file: "06-manageselloffer-native-and-nonnative.png",
    xdr: buildXdr(
      Operation.manageSellOffer({
        selling: Asset.native(),
        buying: usdcLegit,
        amount: "5000",
        price: "1",
        offerId: "0",
      }),
    ),
  },
  {
    file: "07-managebuyoffer.png",
    xdr: buildXdr(
      Operation.manageBuyOffer({
        selling: usdcLegit,
        buying: eurt,
        buyAmount: "100",
        price: "1",
        offerId: "0",
      }),
    ),
  },
  {
    file: "08-createpassiveselloffer.png",
    xdr: buildXdr(
      Operation.createPassiveSellOffer({
        selling: usdcLegit,
        buying: eurt,
        amount: "100",
        price: "1",
      }),
    ),
  },
  {
    file: "09-createclaimablebalance.png",
    xdr: buildXdr(
      Operation.createClaimableBalance({
        asset: usdcLegit,
        amount: "100",
        claimants: [new Claimant(DEST, Claimant.predicateUnconditional())],
      }),
    ),
  },
];

test("capture asset-issuer signing Details screenshots for PR evidence", async ({
  page,
  extensionId,
  context,
}) => {
  test.setTimeout(300000);

  // eslint-disable-next-line no-console
  console.log(
    `Issuers — legit USDC: ${USDC_LEGIT} (GBPL…B6D7); look-alike USDC: ${USDC_FAKE} (GBK2…IP4W); EURT: ${EURT} (GAR2…YDW6)`,
  );

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
    await popup.route("**/scan-tx", async (route) => {
      await route.fulfill({
        json: {
          data: { simulation: { status: "Success" }, validation: null },
        },
      });
    });

    await popup.getByText("Transaction details", { exact: true }).click();
    const detailsBody = popup.getByTestId("DetailsBody");
    await expect(detailsBody).toBeVisible({ timeout: 15000 });
    await popup.waitForTimeout(500);

    await detailsBody.screenshot({ path: `${OUT_DIR}/${file}` });

    await popup.close();
    await dapp.close();
  }
});
