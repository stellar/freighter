import { expect } from "../test-fixtures";
import { Page } from "@playwright/test";
import { switchNetwork } from "./network";

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
  await expect(page.getByTestId("account-chip")).toBeVisible({
    timeout: 50000,
  });
  await switchNetwork(page, "Testnet");
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
};
