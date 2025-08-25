import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import { Address, Keypair, Operation, xdr } from "stellar-sdk";

import { mockAccounts, TEST_PUBLIC_KEY, Wrapper } from "popup/__testHelpers__";
import { KeyValueInvokeHostFn } from "../signTransaction/Operations/KeyVal";
import * as internalApi from "@shared/api/internal";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";
import { ROUTES } from "popup/constants/routes";

describe("Operations KeyVal", () => {
  describe("InvokeHostFunction", () => {
    afterAll(() => {
      jest.clearAllMocks();
    });

    jest.spyOn(internalApi, "getContractSpec").mockImplementation(() => {
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

    it("renders create contract v1", async () => {
      const assetCode = "KHL1";
      const assetType = new xdr.AlphaNum4({
        assetCode: Buffer.from(assetCode),
        issuer: Keypair.fromPublicKey(TEST_PUBLIC_KEY).xdrAccountId(),
      });
      const func = xdr.HostFunction.hostFunctionTypeCreateContract(
        new xdr.CreateContractArgs({
          contractIdPreimage:
            xdr.ContractIdPreimage.contractIdPreimageFromAsset(
              xdr.Asset.assetTypeCreditAlphanum4(assetType),
            ),
          executable: xdr.ContractExecutable.contractExecutableStellarAsset(),
        }),
      );

      const op = {
        func,
      } as Operation.InvokeHostFunction;

      render(<KeyValueInvokeHostFn op={op} />);
      await waitFor(() => screen.getAllByTestId("OperationKeyVal"));

      const invocationTypeLabel = screen.getByText("Type");
      const invocationTypeValue = invocationTypeLabel.parentNode?.querySelector(
        "[data-testid='OperationKeyVal__value']",
      );
      expect(invocationTypeValue).toHaveTextContent("Create Contract");

      const assetCodeLabel = screen.getByText("Asset Code");
      const assetCodeValue = assetCodeLabel.parentNode?.querySelector(
        "[data-testid='OperationKeyVal__value']",
      );
      expect(assetCodeValue).toHaveTextContent(assetCode);

      const issuerLabel = screen.getByText("Issuer");
      const issuerValue = issuerLabel.parentNode?.querySelector(
        "[data-testid='OperationKeyVal__value']",
      );
      expect(issuerValue).toHaveTextContent("GBTY…JZOFCopied");

      const execType = screen.getByText("Executable Type");
      const execTypeValue = execType.parentNode?.querySelector(
        "[data-testid='OperationKeyVal__value']",
      );
      expect(execTypeValue).toHaveTextContent("contractExecutableStellarAsset");
    });

    it("renders create contract v2", async () => {
      const assetCode = "KHL2";
      const assetType = new xdr.AlphaNum4({
        assetCode: Buffer.from(assetCode),
        issuer: Keypair.fromPublicKey(TEST_PUBLIC_KEY).xdrAccountId(),
      });
      const func = xdr.HostFunction.hostFunctionTypeCreateContractV2(
        new xdr.CreateContractArgsV2({
          contractIdPreimage:
            xdr.ContractIdPreimage.contractIdPreimageFromAsset(
              xdr.Asset.assetTypeCreditAlphanum4(assetType),
            ),
          executable: xdr.ContractExecutable.contractExecutableStellarAsset(),
          constructorArgs: [new Address(TEST_PUBLIC_KEY).toScVal()],
        }),
      );

      const op = {
        func,
      } as Operation.InvokeHostFunction;

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
          <KeyValueInvokeHostFn op={op} />
        </Wrapper>,
      );
      await waitFor(() => screen.getAllByTestId("OperationKeyVal"));

      const invocationTypeLabel = screen.getByText("Type");
      const invocationTypeValue = invocationTypeLabel.parentNode?.querySelector(
        "[data-testid='OperationKeyVal__value']",
      );
      expect(invocationTypeValue).toHaveTextContent("Create Contract");

      const assetCodeLabel = screen.getByText("Asset Code");
      const assetCodeValue = assetCodeLabel.parentNode?.querySelector(
        "[data-testid='OperationKeyVal__value']",
      );
      expect(assetCodeValue).toHaveTextContent(assetCode);

      const issuerLabel = screen.getByText("Issuer");
      const issuerValue = issuerLabel.parentNode?.querySelector(
        "[data-testid='OperationKeyVal__value']",
      );
      expect(issuerValue).toHaveTextContent("GBTY…JZOFCopied");

      const execType = screen.getByText("Executable Type");
      const execTypeValue = execType.parentNode?.querySelector(
        "[data-testid='OperationKeyVal__value']",
      );
      expect(execTypeValue).toHaveTextContent("contractExecutableStellarAsset");
    });
  });
});
