import { test, expect } from "./test-fixtures";
import { login, PASSWORD } from "./helpers/login";

// test.beforeAll(async ({ page, extensionId }) => {
//   await page.goto(`chrome-extension://${extensionId}/index.html`);
//   await page.getByText("Import Wallet").click();

//   const TEST_WORDS = generateMnemonic({ entropyBits: 128 }).split(" ");

//   for (let i = 1; i <= TEST_WORDS.length; i++) {
//     await page.locator(`#MnemonicPhrase-${i}`).fill(TEST_WORDS[i - 1]);
//   }

//   await page.locator("#password-input").fill(PASSWORD);
//   await page.locator("#confirm-password-input").fill(PASSWORD);
//   await page.locator("#termsOfUse-input").check({ force: true });
//   await page.getByRole("button", { name: "Import" }).click();
//   await expect(page.getByText("Wallet created successfully!")).toBeVisible({
//     timeout: 20000,
//   });

//   await page.goto(`chrome-extension://${extensionId}/index.html#/account`);
//   await page.getByTestId("network-selector-open").click();
//   await page.getByText("Test Net").click();
//   await page.getByRole("button", { name: "Fund with Friendbot" }).click();

//   await expect(page.getByTestId("account-assets")).toBeVisible({
//     timeout: 10000,
//   });
// });

// test.beforeEach(async ({ page }) => {
//   await page.addInitScript(() => {
//     const mock = {
//       applicationState: "MNEMONIC_PHRASE_CONFIRMED",

//       "stellarkeys:0.6724197884945977": {
//         encryptedBlob:
//           "AYhorC6+806D2+vWt5VOEHhefk2H6DCHoshDTSrVjREGXo8/03K9MRwl0mRPZxMsmlnWI/8gZoBshUceQj1WmOQzSVlXHdyCP1oEs1Wrglb1FffbXEWcHJ4nM5S+ktr1ckUFuCICFV1W7y3+Eo8XTGvdqt1MdZcehSMdiVgMyOLkXsrcDDEhifj7L3TEvnhRBmV875NiL7CRD6C/gJEenFEfQV7wqrS7Ym88gjtRpQ6D57HdA5Buj6tL4Wc9n1nq4H3KAYyeAXwdze7eFWftlnBUUs4T5d9y2UaoauBS8ugj2R1YMMwn0iLEpXdwCDFPD7QWgxzX75jnOTKonPhzu+cFD6Bddl4f4qMaNZVkex980bLW8DpfCHU6slaU2dqOCUTWaph2ZY9N9dM1mXUWA+7YuUJudecRtlUnxKsc8S8=",
//         encrypterName: "ScryptEncrypter",
//         id: "0.6724197884945977",
//         salt: "TseGH97ldIaXjFhPTFL8TyyDi9j+8Hdk7TCm+d2iYd4=",
//       },
//     };
//     // Supposed to mock chrome.storage.sync.get
//     window.chrome.storage.local.get = async () => mock;
//   });
// });

test("Send XLM payment", async ({ page, extensionId }) => {
  await login({ page, extensionId });
  await page.getByTitle("Send Payment").click();

  await expect(page.getByText("Send To")).toBeVisible();
  await page
    .getByTestId("send-to-input")
    .fill("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF");
  await page.getByText("Continue").click();

  await expect(page.getByText("Send XLM")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");
  await page.getByText("Continue").click();

  await expect(page.getByText("Send Settings")).toBeVisible();
  await expect(page.getByTestId("SendSettingsTransactionFee")).toHaveText(
    /[0-9]/,
  );
  await page.getByText("Review Send").click();

  await expect(page.getByText("Verification")).toBeVisible();
  await page.getByPlaceholder("Enter password").fill(PASSWORD);
  await page.getByText("Submit").click();

  await expect(page.getByText("Confirm Send")).toBeVisible();
  await page.getByTestId("transaction-details-btn-send").click();

  await expect(page.getByText("Successfully sent")).toBeVisible({
    timeout: 20000,
  });

  await page.getByText("Details").click();
  await expect(page.getByText("Sent XLM")).toBeVisible();
  await expect(page.getByTestId("asset-amount")).toContainText("1 XLM");
});
