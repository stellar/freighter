import { test, expect } from "./test-fixtures";
import { login, PASSWORD } from "./helpers/login";

const SECRET = "SDS2P4ITL56TSGX4NQB3MPS7PCMVZA77LXPIWS7P5HK5EPXRUHFJZBHG";
const DEST = "GC5A2U7ALBI65DGV627MNB4OEJCSURYCWBEBFOGRZ4F6M2T2P7LN57Q2";
const USDC =
  "USDC:GCKUFD5KAAM6DRSLODK55OVECMB5IJ5NSFQYFTBZRPOTJASUKTBZXGS2";

test("pays the network fee in USDC with 0 spendable XLM", async ({
  page,
  extensionId,
}) => {
  test.setTimeout(240_000);

  await login({ page, extensionId });

  await page.goto(
    `chrome-extension://${extensionId}/index.html#/account/import`,
  );
  await page.locator("#privateKey-input").fill(SECRET);
  await page.locator("#password-input").fill(PASSWORD);
  await page.locator("#authorization-input").check({ force: true });
  await page.getByTestId("import-account-button").click();

  await expect(page.getByTestId("account-view")).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole("button", { name: /USDC 2/ })).toBeVisible({
    timeout: 30000,
  });

  await page.goto(
    `chrome-extension://${extensionId}/index.html#/account/sendPayment`,
  );
  await expect(page.getByTestId(`SendRow-${USDC}`)).toBeVisible({
    timeout: 15000,
  });
  await page.getByTestId(`SendRow-${USDC}`).click();
  await expect(page.getByTestId("send-to-input")).toBeVisible({
    timeout: 15000,
  });
  await page.getByTestId("send-to-input").fill(DEST);
  await expect(page.getByTestId("send-to-btn-continue")).toBeEnabled({
    timeout: 15000,
  });
  await page.getByTestId("send-to-btn-continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible({
    timeout: 15000,
  });
  await page.getByTestId("send-amount-amount-input").fill("1");

  await expect(page.getByTestId("send-amount-fee-asset")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByTestId("send-amount-fee-asset")).toHaveValue(USDC);

  await expect(page.getByTestId("send-amount-btn-continue")).toBeEnabled({
    timeout: 30000,
  });
  await page.getByTestId("send-amount-btn-continue").click();

  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByTestId("review-tx-fee")).toContainText("USDC");

  const submit = page.getByTestId("SubmitAction");
  await expect(submit).toBeEnabled({ timeout: 30000 });
  await submit.click();
  await expect(page.getByText("Sent!")).toBeVisible({ timeout: 60000 });
});
