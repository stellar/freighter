import { expect } from "../test-fixtures";
import { Page } from "@playwright/test";
import { switchNetwork } from "./network";
import { PASSWORD, TEST_ACCOUNT_WORDS } from "./login";
import {
  enterImportSecret,
  fillPasswordAndConfirm,
  waitForImportSuccess,
} from "./onboarding";

export { PASSWORD };

export const loginToTestAccountPT = async ({
  page,
  extensionId,
}: {
  page: Page;
  extensionId: string;
}) => {
  await page.goto(`chrome-extension://${extensionId}/index.html`);
  await page.getByText("Importar carteira").click();
  await expect(
    page.getByText(
      "Importe sua carteira usando uma frase de recuperação ou chave secreta",
    ),
  ).toBeVisible();

  // GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY
  await enterImportSecret({
    page,
    secret: TEST_ACCOUNT_WORDS.join(" "),
  });

  await expect(page.getByText("Criar uma Senha")).toBeVisible();
  await fillPasswordAndConfirm({
    page,
    password: PASSWORD,
    confirmLabel: "Confirmar",
  });

  await waitForImportSuccess({ page, successText: "Tudo pronto!" });

  await page.goto(`chrome-extension://${extensionId}/index.html#/`);
  await expect(page.getByTestId("account-chip")).toBeVisible({
    timeout: 50000,
  });
  await switchNetwork(page, "Testnet");
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
};
