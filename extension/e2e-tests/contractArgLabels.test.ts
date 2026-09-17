import {
  Account,
  Address,
  Networks,
  Operation,
  ScInt,
  StrKey,
  TransactionBuilder,
  xdr,
} from "stellar-sdk";

import { expect, test } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import { openSignTransactionPopup } from "./helpers/dAppSessionHelper";
import { abortApiEndpoint, stubContractSpecDefinitions } from "./helpers/stubs";

const CONTRACT = "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";
const SIGNER = "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY";

const START_AT = 1750000000;
const DURATION = 604800;
const TPS = 42;

/**
 * gauge_schedule_reward(router, distributor, gauge, start_at: Option<u64>,
 * duration, tps) -- the shape from wallet-eng-monorepo#70. `properties` carries
 * all six parameters in declaration order; `required` omits the Option.
 */
const GAUGE_DEFINITIONS = {
  gauge_schedule_reward: {
    properties: {
      args: {
        type: "object",
        properties: {
          router: {},
          distributor: {},
          gauge: {},
          start_at: {},
          duration: {},
          tps: {},
        },
        required: ["router", "distributor", "gauge", "duration", "tps"],
      },
    },
  },
};

const buildInvocationArgs = () =>
  new xdr.InvokeContractArgs({
    contractAddress: xdr.ScAddress.scAddressTypeContract(
      new xdr.ContractId(StrKey.decodeContract(CONTRACT)),
    ),
    functionName: Buffer.from("gauge_schedule_reward"),
    args: [
      new Address(CONTRACT).toScVal(),
      new Address(SIGNER).toScVal(),
      new Address(CONTRACT).toScVal(),
      new ScInt(START_AT).toU64(),
      new ScInt(DURATION).toU64(),
      new ScInt(TPS).toI128(),
    ],
  });

const buildInvokeXdr = (withAuth = false) => {
  const func = xdr.HostFunction.hostFunctionTypeInvokeContract(
    buildInvocationArgs(),
  );

  const auth = withAuth
    ? [
        new xdr.SorobanAuthorizationEntry({
          credentials: xdr.SorobanCredentials.sorobanCredentialsSourceAccount(),
          rootInvocation: new xdr.SorobanAuthorizedInvocation({
            function:
              xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
                buildInvocationArgs(),
              ),
            subInvocations: [],
          }),
        }),
      ]
    : [];

  return new TransactionBuilder(new Account(SIGNER, "0"), {
    fee: "1000000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.invokeHostFunction({ func, auth }))
    .setTimeout(0)
    .build()
    .toXDR();
};

const openDetailsPane = async (popup: any) => {
  await expect(popup.getByText("Confirm Transaction")).toBeVisible();
  await popup.getByText("Transaction details").click();
  await expect(popup.getByTestId("OperationParameters").first()).toBeVisible();
};

test.describe("contract argument labels", () => {
  test("labels every argument when a middle parameter is optional", async ({
    page,
    extensionId,
    context,
  }) => {
    await loginToTestAccount({
      page,
      extensionId,
      context,
      stubOverrides: async () => {
        await stubContractSpecDefinitions(context, CONTRACT, GAUGE_DEFINITIONS);
      },
    });

    const popup = await openSignTransactionPopup({
      page,
      xdr: buildInvokeXdr(),
    });
    await stubContractSpecDefinitions(popup, CONTRACT, GAUGE_DEFINITIONS);
    await openDetailsPane(popup);

    const keys = popup.getByTestId("ParameterKey");
    const values = popup.getByTestId("ParameterValue");

    await expect(keys).toHaveCount(6);
    await expect(keys.nth(0)).toHaveText(/router/);
    await expect(keys.nth(1)).toHaveText(/distributor/);
    await expect(keys.nth(2)).toHaveText(/gauge/);
    await expect(keys.nth(3)).toHaveText(/start_at/);
    await expect(keys.nth(4)).toHaveText(/duration/);
    await expect(keys.nth(5)).toHaveText(/tps/);

    // The timestamp must sit under start_at, not under duration.
    await expect(values.nth(3)).toHaveText(String(START_AT));
    await expect(values.nth(4)).toHaveText(String(DURATION));
    await expect(values.nth(5)).toHaveText(String(TPS));
  });

  test("renders unlabelled rows when the spec cannot be fetched", async ({
    page,
    extensionId,
    context,
  }) => {
    await loginToTestAccount({
      page,
      extensionId,
      context,
      stubOverrides: async () => {
        await abortApiEndpoint(page, "**/contract-spec/**");
      },
    });

    const popup = await openSignTransactionPopup({
      page,
      xdr: buildInvokeXdr(),
    });
    await abortApiEndpoint(popup, "**/contract-spec/**");
    await openDetailsPane(popup);

    const keys = popup.getByTestId("ParameterKey");
    await expect(keys).toHaveCount(6);
    for (let i = 0; i < 6; i++) {
      await expect(keys.nth(i)).toHaveText("");
    }
  });

  test("renders an all-optional function instead of crashing the popup", async ({
    page,
    extensionId,
    context,
  }) => {
    // Every parameter optional means `Spec.jsonSchema()` omits `required`
    // entirely, which used to make the parameter list throw into the app-level
    // ErrorBoundary and replace the whole signing view.
    const allOptional = {
      gauge_schedule_reward: {
        properties: {
          args: {
            type: "object",
            properties: {
              router: {},
              distributor: {},
              gauge: {},
              start_at: {},
              duration: {},
              tps: {},
            },
          },
        },
      },
    };

    await loginToTestAccount({
      page,
      extensionId,
      context,
      stubOverrides: async () => {
        await stubContractSpecDefinitions(context, CONTRACT, allOptional);
      },
    });

    const popup = await openSignTransactionPopup({
      page,
      xdr: buildInvokeXdr(),
    });
    await stubContractSpecDefinitions(popup, CONTRACT, allOptional);
    await openDetailsPane(popup);

    await expect(
      popup.getByText("An unexpected error has occurred"),
    ).toHaveCount(0);
    await expect(popup.getByTestId("ParameterKey")).toHaveCount(6);
    await expect(popup.getByTestId("ParameterKey").nth(3)).toHaveText(
      /start_at/,
    );
  });

  test("never labels auth entry args from the contract spec (#2196)", async ({
    page,
    extensionId,
    context,
  }) => {
    // An auth's args need not be the function's declared parameters --
    // require_auth_for_args can substitute an arbitrary list under the same
    // contract and function name -- so the auth rows stay unlabelled even
    // though the very same spec is fetched and correctly names the operation's
    // rows on the same screen.
    await loginToTestAccount({
      page,
      extensionId,
      context,
      stubOverrides: async () => {
        await stubContractSpecDefinitions(context, CONTRACT, GAUGE_DEFINITIONS);
      },
    });

    const popup = await openSignTransactionPopup({
      page,
      xdr: buildInvokeXdr(true),
    });
    await stubContractSpecDefinitions(popup, CONTRACT, GAUGE_DEFINITIONS);

    await expect(popup.getByText("Confirm Transaction")).toBeVisible();
    await popup.getByText("Transaction details").click();
    await expect(popup.getByTestId("AuthEntryContainer").first()).toBeVisible();
    await popup.getByTestId("AuthEntryBtn").first().click();
    await expect(popup.getByTestId("AuthEntryContent").first()).toBeVisible();

    const authKeys = popup
      .getByTestId("AuthEntryContent")
      .first()
      .getByTestId("ParameterKey");
    await expect(authKeys).toHaveCount(6);
    for (let i = 0; i < 6; i++) {
      await expect(authKeys.nth(i)).toHaveText("");
    }

    // Same screen, same spec: the operation's rows carry the declared names,
    // proving the auth rows are unlabelled by policy and not because the spec
    // was unavailable.
    // AuthEntries renders above Details and reuses the same test ids, so scope
    // to DetailsBody to reach the operation's own parameter list.
    const operationKeys = popup
      .getByTestId("DetailsBody")
      .getByTestId("ParameterKey");
    await expect(operationKeys.nth(0)).toHaveText(/router/);
    await expect(operationKeys.nth(3)).toHaveText(/start_at/);
  });
});
