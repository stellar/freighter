import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import { Address, Keypair, xdr } from "stellar-sdk";

import { mockAccounts, TEST_PUBLIC_KEY, Wrapper } from "popup/__testHelpers__";
import { AuthEntries } from "../AuthEntry";
import * as internalApi from "@shared/api/internal";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";
import { ROUTES } from "popup/constants/routes";

describe("AuthEntry", () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  const getContractSpecSpy = jest
    .spyOn(internalApi, "getContractSpec")
    .mockImplementation(() => {
      return Promise.resolve({
        definitions: {
          create: {
            properties: {
              args: ["admin"],
            },
          },
        },
      });
    });

  it("renders auth entries for create contract v2", async () => {
    const assetCode = "KHL1";
    const assetType = new xdr.AlphaNum4({
      assetCode: Buffer.from(assetCode),
      issuer: Keypair.fromPublicKey(TEST_PUBLIC_KEY).xdrAccountId(),
    });

    const args = new xdr.CreateContractArgsV2({
      contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAsset(
        xdr.Asset.assetTypeCreditAlphanum4(assetType),
      ),
      executable: xdr.ContractExecutable.contractExecutableStellarAsset(),
      constructorArgs: [new Address(TEST_PUBLIC_KEY).toScVal()],
    });

    const authorizedFn =
      xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeCreateContractV2HostFn(
        args,
      );
    const authorizedInvocation = new xdr.SorobanAuthorizedInvocation({
      function: authorizedFn,
      subInvocations: [],
    });

    render(
      <Wrapper
        routes={[ROUTES.reviewAuthorization]}
        state={{
          auth: {
            error: null,
            applicationState: APPLICATION_STATE.PASSWORD_CREATED,
            TEST_PUBLIC_KEY,
            allAccounts: mockAccounts,
            hasPrivateKey: true,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
            isSorobanPublicEnabled: true,
            isRpcHealthy: true,
          },
        }}
      >
        <AuthEntries invocations={[authorizedInvocation]} />
      </Wrapper>,
    );
    await waitFor(() => screen.getAllByTestId("AuthEntryContainer"));
    await fireEvent.click(screen.getByTestId("AuthEntryBtn"));
    await waitFor(() => screen.getAllByTestId("AuthEntryContent"));

    expect(screen.getByTestId("AuthEntryBtn__Title")).toHaveTextContent(
      "Contract creation",
    );

    expect(getContractSpecSpy).not.toHaveBeenCalled();

    const parameterKeys = screen.getAllByTestId("ParameterKey");
    const parameterValues = screen.getAllByTestId("ParameterValue");

    expect(parameterKeys).toHaveLength(1);
    expect(parameterKeys[0]).toHaveTextContent("");

    expect(parameterValues).toHaveLength(1);
    expect(parameterValues[0]).toHaveTextContent(TEST_PUBLIC_KEY);
  });
});
