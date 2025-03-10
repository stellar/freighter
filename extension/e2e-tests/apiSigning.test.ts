import { expect, test } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";

test("Sign Transaction", async ({ page, extensionId }) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });

  const TX_TO_SIGN =
    "AAAAAgAAAADLvQoIbFw9k0tgjZoOrLTuJJY9kHFYp/YAEAlt/xirbAAAAGQAAAfjAAAOpQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAAAAAAAAAAAvrwgAAAAAAAAAAA";
  const SIGNED_TX =
    "AAAAAgAAAADLvQoIbFw9k0tgjZoOrLTuJJY9kHFYp/YAEAlt/xirbAAAAGQAAAfjAAAOpQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAAAAAAAAAAAvrwgAAAAAAAAAAB/xirbAAAAEBWgE2DhhukpAdJTOhBxvuvePAJH+gBbD3hQQljuidQbTFDMEyak7c2fOjyK2moqVhf3AUpCIMSlALglwFXumQH";

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://docs.freighter.app/docs/playground/signTransaction",
  );
  await pageTwo.getByRole("textbox").first().fill(TX_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Sign Transaction XDR").click();

  const popup = await popupPromise;

  await expect(popup.getByText("Transaction Request")).toBeVisible();
  await expect(popup.getByText("Payment")).toBeVisible();

  await popup.getByTestId("Tab-Details").click();
  await expect(popup.getByTestId("OperationKeyVal__key").first()).toHaveText(
    "Destination",
  );
  await expect(popup.getByTestId("OperationKeyVal__value").first()).toHaveText(
    "GBTY…JZOF",
  );

  await expect(popup.getByTestId("OperationKeyVal__key").nth(1)).toHaveText(
    "Asset Code",
  );
  await expect(popup.getByTestId("OperationKeyVal__value").nth(1)).toHaveText(
    "XLM",
  );
  await expect(popup.getByTestId("OperationKeyVal__key").nth(2)).toHaveText(
    "Amount",
  );
  await expect(popup.getByTestId("OperationKeyVal__value").nth(2)).toHaveText(
    "5.0000000",
  );
  await popup.getByRole("button", { name: "Sign" }).click();

  await expect(pageTwo.getByRole("textbox").nth(3)).toHaveText(SIGNED_TX);
  await expect(pageTwo.getByRole("textbox").nth(4)).toHaveValue(
    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
  );
});

test("Sign Auth Entry", async ({ page, extensionId }) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });

  const AUTH_ENTRY_TO_SIGN =
    "AAAACc7gMC1ZhE0yvcqRXIID3USzP7t+3BkFHqN6vt8o7NRyGVzFh1h1V3oANBPZAAAAAAAAAAGhRTk9qFLakLcWsi5wS6hhHr80ka5WABdo/8hF7QmS3QAAAARzd2FwAAAABAAAABIAAAAB0kc/9lM7RuxEsaiiUFR+T89kG7IOUk1U0cXCIDkTDesAAAASAAAAAZ+9o35h9wEnNl2hiVZHRJxsDoO3altsu023K1kAex/nAAAACgAAAAAAAAAAAAAAAAADDUAAAAAKAAAAAAAAAAAAAAAAAAGGoAAAAAEAAAAAAAAAAdJHP/ZTO0bsRLGoolBUfk/PZBuyDlJNVNHFwiA5Ew3rAAAACHRyYW5zZmVyAAAAAwAAABIAAAAAAAAAAFVmR/NPwhQJzrxxqVrqFZ83Hy9HmP4trSdB/dX7sAZjAAAAEgAAAAGhRTk9qFLakLcWsi5wS6hhHr80ka5WABdo/8hF7QmS3QAAAAoAAAAAAAAAAAAAAAAAAw1AAAAAAA==";

  const SIGNED_AUTH_ENTRY = JSON.stringify({
    type: "Buffer",
    data: [
      165, 67, 16, 42, 244, 165, 43, 189, 159, 221, 121, 137, 153, 150, 203, 45,
      93, 57, 72, 249, 253, 123, 201, 63, 246, 111, 81, 64, 229, 182, 24, 57,
      169, 81, 159, 223, 75, 150, 86, 14, 192, 5, 222, 178, 110, 148, 104, 60,
      1, 82, 246, 212, 89, 84, 175, 233, 209, 21, 193, 126, 172, 179, 162, 3,
    ],
  });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://docs.freighter.app/docs/playground/signAuthEntry",
  );
  await pageTwo.getByRole("textbox").first().fill(AUTH_ENTRY_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Sign Authorization Entry XDR").click();

  const popup = await popupPromise;

  await expect(popup.getByText("Authorization Entry").first()).toBeVisible();

  await popup.getByRole("button", { name: "Approve" }).click();

  await expect(pageTwo.getByRole("textbox").nth(3)).toHaveText(
    SIGNED_AUTH_ENTRY,
  );
});

test("Sign Message", async ({ page, extensionId }) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });

  const MSG_TO_SIGN = "test message";

  const SIGNED_MSG =
    '"vtBm2byHA0fY2ZsV46t2owv/sD5RfS+iExq7/u37C7ZE401RAGsIsEIHfdbFqOez+KOiBbTT8BKvHtq8/WXYAA=="';

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto("https://docs.freighter.app/docs/playground/signMessage");
  await pageTwo.getByRole("textbox").first().fill(MSG_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Sign message").click();

  const popup = await popupPromise;

  await expect(popup.getByText(MSG_TO_SIGN)).toBeVisible();

  await popup.getByRole("button", { name: "Approve" }).click();

  await expect(pageTwo.getByRole("textbox").nth(3)).toHaveText(SIGNED_MSG);
  await expect(pageTwo.getByRole("textbox").nth(4)).toHaveValue(
    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
  );
});
