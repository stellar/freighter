import React from "react";
import { render, waitFor, screen, cleanup } from "@testing-library/react";
import { Address, Keypair, Operation, StrKey, xdr } from "stellar-sdk";

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

    describe("invoke contract - Contract ID truncation", () => {
      const CONTRACT =
        "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";
      let matchMediaListeners: Array<(e: { matches: boolean }) => void>;
      let currentMatches: boolean;

      function mockMatchMedia(matches: boolean) {
        currentMatches = matches;
        matchMediaListeners = [];
        Object.defineProperty(window, "matchMedia", {
          writable: true,
          value: jest.fn().mockImplementation((query: string) => ({
            matches: currentMatches,
            media: query,
            addEventListener: jest.fn(
              (_event: string, handler: (e: { matches: boolean }) => void) => {
                matchMediaListeners.push(handler);
              },
            ),
            removeEventListener: jest.fn(),
          })),
        });
      }

      function buildInvokeContractOp() {
        const func = xdr.HostFunction.hostFunctionTypeInvokeContract(
          new xdr.InvokeContractArgs({
            contractAddress: xdr.ScAddress.scAddressTypeContract(
              StrKey.decodeContract(CONTRACT) as any,
            ),
            functionName: Buffer.from("transfer"),
            args: [],
          }),
        );
        return { func } as Operation.InvokeHostFunction;
      }

      afterEach(() => {
        cleanup();
      });

      it("truncates the Contract ID on narrow screens", async () => {
        mockMatchMedia(false);
        const op = buildInvokeContractOp();
        render(<KeyValueInvokeHostFn op={op} />);
        await waitFor(() => screen.getAllByTestId("OperationKeyVal"));

        const contractIdLabel = screen.getByText("Contract ID");
        const contractIdValue = contractIdLabel.parentNode?.querySelector(
          "[data-testid='OperationKeyVal__value']",
        );
        expect(contractIdValue).toHaveTextContent("CA3D…GAXE");
        expect(contractIdValue).not.toHaveTextContent(CONTRACT);
      });

      it("shows the full Contract ID on wide screens", async () => {
        mockMatchMedia(true);
        const op = buildInvokeContractOp();
        render(<KeyValueInvokeHostFn op={op} />);
        await waitFor(() => screen.getAllByTestId("OperationKeyVal"));

        const contractIdLabel = screen.getByText("Contract ID");
        const contractIdValue = contractIdLabel.parentNode?.querySelector(
          "[data-testid='OperationKeyVal__value']",
        );
        expect(contractIdValue).toHaveTextContent(CONTRACT);
      });

      it("applies the expanded class only on wide screens", async () => {
        mockMatchMedia(true);
        const op = buildInvokeContractOp();
        render(<KeyValueInvokeHostFn op={op} />);
        await waitFor(() => screen.getAllByTestId("OperationKeyVal"));

        const contractIdLabel = screen.getByText("Contract ID");
        const contractIdValue = contractIdLabel.parentNode?.querySelector(
          "[data-testid='OperationKeyVal__value']",
        );
        expect(contractIdValue?.className).toContain(
          "Operations__pair--value-expanded",
        );
      });

      it("does not apply the expanded class on narrow screens", async () => {
        mockMatchMedia(false);
        const op = buildInvokeContractOp();
        render(<KeyValueInvokeHostFn op={op} />);
        await waitFor(() => screen.getAllByTestId("OperationKeyVal"));

        const contractIdLabel = screen.getByText("Contract ID");
        const contractIdValue = contractIdLabel.parentNode?.querySelector(
          "[data-testid='OperationKeyVal__value']",
        );
        expect(contractIdValue?.className).not.toContain(
          "Operations__pair--value-expanded",
        );
      });
    });
  });
});
