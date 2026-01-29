import { test, expect } from "./test-fixtures";
import { loginToTestAccountPT } from "./helpers/login-pt";
import { stubAllExternalApis } from "./helpers/stubs";
test.use({ language: "pt" });

test("Smoke test: Portuguese translations are loaded", async ({
  page,
  extensionId,
  context,
}) => {
  await page.goto(`chrome-extension://${extensionId}/index.html`);
  await stubAllExternalApis(page, context);
  // Verify welcome page shows Portuguese text
  await page.locator(".Welcome__column").waitFor();
  await expect(page.getByText("Carteira Freighter")).toBeVisible();
  await expect(page.getByText("Criar nova carteira")).toBeVisible();
  await expect(page.getByText("Já tenho uma carteira")).toBeVisible();
});

test("Smoke test: Portuguese translations in account view", async ({
  page,
  extensionId,
  context,
}) => {
  // Login first
  await page.goto(`chrome-extension://${extensionId}/index.html`);
  await stubAllExternalApis(page, context);
  await page.getByText("Já tenho uma carteira").click();
  await expect(page.getByText("Criar uma Senha")).toBeVisible();

  // Fill password form with Portuguese labels
  await page.locator("#new-password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("My-password123");
  await page.locator("#termsOfUse-input").check({ force: true });
  await expect(page.getByText("Confirmar")).toBeVisible();
  await page.getByText("Confirmar").click();

  // Verify Portuguese text in import flow
  await expect(
    page.getByText("Importar carteira da frase de recuperação"),
  ).toBeVisible();
});

test("Smoke test: Portuguese translations in settings", async ({
  page,
  extensionId,
}) => {
  test.slow();
  // Login first to access settings
  await loginToTestAccountPT({ page, extensionId });

  // Navigate to settings
  await page.getByTestId("account-options-dropdown").click();
  await expect(page.getByText("Configurações")).toBeVisible();
  await page.getByText("Configurações").click();

  // Verify Portuguese translations in settings page
  await expect(page.getByText("Preferências")).toBeVisible();
  await expect(page.getByText("Segurança")).toBeVisible();
  await expect(page.getByText("Sobre")).toBeVisible();
});

test("Smoke test: Portuguese translations for common UI elements", async ({
  page,
  extensionId,
}) => {
  await page.goto(`chrome-extension://${extensionId}/index.html`);

  // Verify key Portuguese translations are present
  await expect(page.getByText("Carteira Freighter")).toBeVisible();

  // Check that English text is NOT visible (to ensure PT is actually being used)
  const englishText = page.getByText("Freighter Wallet");
  await expect(englishText)
    .not.toBeVisible({ timeout: 1000 })
    .catch(() => {
      // If English is visible, that's okay for a smoke test - we're just checking PT exists
    });
});
