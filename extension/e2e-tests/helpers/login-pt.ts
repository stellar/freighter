import StellarHDWallet from "stellar-hd-wallet";
import { expect } from "../test-fixtures-pt";
import { Page } from "@playwright/test";

const { generateMnemonic } = StellarHDWallet;

export const PASSWORD = "My-password123";

export const loginToTestAccountPT = async ({
  page,
  extensionId,
}: {
  page: Page;
  extensionId: string;
}) => {
  await page.goto(`chrome-extension://${extensionId}/index.html`);
  await page.getByText("Já tenho uma carteira").click();

  await expect(page.getByText("Criar uma Senha")).toBeVisible();

  await page.locator("#new-password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("My-password123");
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirmar").click();

  // GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY

  const TEST_ACCOUNT_WORDS = [
    "card",
    "whip",
    "erosion",
    "fatal",
    "reunion",
    "foil",
    "doctor",
    "embark",
    "plug",
    "note",
    "thank",
    "company",
  ];

  for (let i = 1; i <= TEST_ACCOUNT_WORDS.length; i++) {
    await page.locator(`#MnemonicPhrase-${i}`).fill(TEST_ACCOUNT_WORDS[i - 1]);
  }

  await page.getByRole("button", { name: "Importar" }).click();
  await expect(page.getByText("Tudo pronto!")).toBeVisible({
    timeout: 20000,
  });

  await page.goto(`chrome-extension://${extensionId}/index.html#/`);
  await expect(page.getByTestId("network-selector-open")).toBeVisible({
    timeout: 50000,
  });
  await page.getByTestId("network-selector-open").click();
  await page.getByText("Test Net").click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
};
