import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import {
  Address,
  Asset,
  Operation,
  OperationRecord,
  xdr,
  StrKey,
  ScInt,
} from "stellar-sdk";

import { mockAccounts, TEST_PUBLIC_KEY, Wrapper } from "popup/__testHelpers__";
import { Operations } from "../signTransaction/Operations";
import * as internalApi from "@shared/api/internal";
import { ROUTES } from "popup/constants/routes";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";

describe("Operations", () => {
  describe("InvokeHostFunction", () => {
    afterAll(() => {
      jest.clearAllMocks();
    });

    jest.spyOn(internalApi, "getContractSpec").mockImplementation(() => {
      return Promise.resolve({
        definitions: {
          transfer: {
            properties: {
              args: { required: ["from", "to", "amount"] },
            },
          },
        },
      });
    });

    it("renders transfer operations if contract spec is available", async () => {
      const CONTRACT =
        "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";

      const func = xdr.HostFunction.hostFunctionTypeInvokeContract(
        new xdr.InvokeContractArgs({
          contractAddress: xdr.ScAddress.scAddressTypeContract(
            StrKey.decodeContract(CONTRACT) as any,
          ),
          functionName: Buffer.from("transfer"),
          args: [
            new Address(TEST_PUBLIC_KEY).toScVal(),
            new Address(TEST_PUBLIC_KEY).toScVal(),
            new ScInt(100).toI128(),
          ],
        }),
      );

      const op = {
        auth: [],
        func,
        type: "invokeHostFunction",
      } as Operation.InvokeHostFunction;

      render(
        <Wrapper
          routes={[ROUTES.signTransaction]}
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
          <Operations
            operations={[op]}
            flaggedKeys={{}}
            isMemoRequired={false}
          />
          ,
        </Wrapper>,
      );

      await waitFor(() => screen.getAllByTestId("ParameterKey"));
      const parameterKeys = screen.getAllByTestId("ParameterKey");
      const parameterValues = screen.getAllByTestId("ParameterValue");

      const invocationTypeLabel = screen.getByText("Type");
      const invocationTypeValue = invocationTypeLabel.parentNode?.querySelector(
        "[data-testid='OperationKeyVal__value']",
      );
      expect(invocationTypeValue).toHaveTextContent("Invoke Contract");

      const invocationContractLabel = screen.getByText("Contract ID");
      const invocationContractValue =
        invocationContractLabel.parentNode?.querySelector(
          "[data-testid='OperationKeyVal__value']",
        );
      expect(invocationContractValue).toHaveTextContent("CA3D…GAXE");

      expect(parameterKeys).toHaveLength(3);
      expect(parameterKeys[0]).toHaveTextContent("from");
      expect(parameterKeys[1]).toHaveTextContent("to");
      expect(parameterKeys[2]).toHaveTextContent("amount");

      expect(parameterValues).toHaveLength(3);
      expect(parameterValues[0]).toHaveTextContent(TEST_PUBLIC_KEY);
      expect(parameterValues[1]).toHaveTextContent(TEST_PUBLIC_KEY);
      expect(parameterValues[2]).toHaveTextContent("100");
    });

    it("renders transfer operations if contract spec is not available", async () => {
      jest.spyOn(internalApi, "getContractSpec").mockImplementation(() => {
        return Promise.reject({});
      });
      const CONTRACT =
        "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";

      const func = xdr.HostFunction.hostFunctionTypeInvokeContract(
        new xdr.InvokeContractArgs({
          contractAddress: xdr.ScAddress.scAddressTypeContract(
            StrKey.decodeContract(CONTRACT) as any,
          ),
          functionName: Buffer.from("transfer"),
          args: [
            new Address(TEST_PUBLIC_KEY).toScVal(),
            new Address(TEST_PUBLIC_KEY).toScVal(),
            new ScInt(100).toI128(),
          ],
        }),
      );

      const op = {
        auth: [],
        func,
        type: "invokeHostFunction",
      } as Operation.InvokeHostFunction;

      render(
        <Wrapper
          routes={[ROUTES.signTransaction]}
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
          <Operations
            operations={[op]}
            flaggedKeys={{}}
            isMemoRequired={false}
          />
          ,
        </Wrapper>,
      );

      await waitFor(() => screen.getAllByTestId("ParameterKey"));
      const parameterKeys = screen.getAllByTestId("ParameterKey");
      const parameterValues = screen.getAllByTestId("ParameterValue");

      const invocationTypeLabel = screen.getByText("Type");
      const invocationTypeValue = invocationTypeLabel.parentNode?.querySelector(
        "[data-testid='OperationKeyVal__value']",
      );
      expect(invocationTypeValue).toHaveTextContent("Invoke Contract");

      const invocationContractLabel = screen.getByText("Contract ID");
      const invocationContractValue =
        invocationContractLabel.parentNode?.querySelector(
          "[data-testid='OperationKeyVal__value']",
        );
      expect(invocationContractValue).toHaveTextContent("CA3D…GAXE");

      expect(parameterKeys).toHaveLength(3);
      expect(parameterKeys[0]).not.toHaveTextContent("from");
      expect(parameterKeys[1]).not.toHaveTextContent("to");
      expect(parameterKeys[2]).not.toHaveTextContent("amount");

      expect(parameterValues).toHaveLength(3);
      expect(parameterValues[0]).toHaveTextContent(TEST_PUBLIC_KEY);
      expect(parameterValues[1]).toHaveTextContent(TEST_PUBLIC_KEY);
      expect(parameterValues[2]).toHaveTextContent("100");
    });
    it("renders changeTrust operation", async () => {
      const assetCode = "KHL3";
      const op = {
        line: {
          code: assetCode,
          issuer: TEST_PUBLIC_KEY,
        },
        limit: "100",
        type: "changeTrust",
      } as Operation.ChangeTrust;
      render(
        <Wrapper
          routes={[ROUTES.signTransaction]}
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
          <Operations
            operations={[op]}
            flaggedKeys={{}}
            isMemoRequired={false}
          />
          ,
        </Wrapper>,
      );
      await waitFor(() => screen.getAllByTestId("OperationKeyVal"));
      const assetCodeLabel = screen.getByText("Token Code");
      const assetCodeValue = assetCodeLabel.parentNode?.querySelector(
        "[data-testid='OperationKeyVal__value']",
      );
      expect(assetCodeValue).toHaveTextContent(assetCode);

      const issuerLabel = screen.getByText("Token Issuer");
      const issuerValue = issuerLabel.parentNode?.querySelector(
        "[data-testid='OperationKeyVal__value']",
      );
      expect(issuerValue).toHaveTextContent("GBTY…JZOFCopied");

      const limitLabel = screen.getByText("Limit");
      const limitValue = limitLabel.parentNode?.querySelector(
        "[data-testid='OperationKeyVal__value']",
      );
      expect(limitValue).toHaveTextContent("100");
    });
  });

  describe("Payment and Swap details (mobile parity)", () => {
    const renderOp = (op: OperationRecord) =>
      render(
        <Wrapper
          routes={[ROUTES.signTransaction]}
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
          <Operations
            operations={[op]}
            flaggedKeys={{}}
            isMemoRequired={false}
          />
        </Wrapper>,
      );

    const valueOf = (label: string) =>
      screen
        .getByText(label)
        .parentNode?.querySelector("[data-testid='OperationKeyVal__value']");

    it("renders a payment with the Token Code label and amount with its code", async () => {
      renderOp({
        type: "payment",
        destination: TEST_PUBLIC_KEY,
        asset: { code: "XLM" },
        amount: "100.0000000",
      } as unknown as OperationRecord);
      await waitFor(() => screen.getAllByTestId("OperationKeyVal"));

      expect(screen.queryByText("Asset Code")).toBeNull();
      expect(valueOf("Token Code")).toHaveTextContent("XLM");
      expect(valueOf("Amount")).toHaveTextContent("100.0000000 XLM");
    });

    it("renders a swap with amounts carrying their token code and a clean destination token", async () => {
      renderOp({
        type: "pathPaymentStrictSend",
        sendAsset: { code: "XLM" },
        sendAmount: "12.3456789",
        destination: TEST_PUBLIC_KEY,
        destAsset: { code: "PYUSD" },
        destMin: "2.2044110",
        path: [],
      } as unknown as OperationRecord);
      await waitFor(() => screen.getAllByTestId("OperationKeyVal"));

      expect(valueOf("Token Code")).toHaveTextContent("XLM");
      expect(valueOf("Send Amount")).toHaveTextContent("12.3456789 XLM");
      // The destination token renders as plain text ("Destination Token"), not
      // via KeyValueWithPublicKey, which would truncate long codes like "PYUSD".
      expect(screen.queryByText("Destination Asset")).toBeNull();
      expect(valueOf("Destination Token")).toHaveTextContent("PYUSD");
      expect(valueOf("Destination Minimum")).toHaveTextContent(
        "2.2044110 PYUSD",
      );
    });

    it("renders the swap path as numbered cards with token and issuer", async () => {
      renderOp({
        type: "pathPaymentStrictSend",
        sendAsset: { code: "XLM" },
        sendAmount: "12.3456789",
        destination: TEST_PUBLIC_KEY,
        destAsset: { code: "PYUSD" },
        destMin: "2.2044110",
        path: [{ code: "USDC", issuer: TEST_PUBLIC_KEY }],
      } as unknown as OperationRecord);
      await waitFor(() => screen.getAllByTestId("OperationKeyVal"));

      expect(screen.getByText("Path")).toBeDefined();
      expect(screen.getByText("#1")).toBeDefined();
      expect(screen.getByText("USDC")).toBeDefined();
      expect(screen.getByText("Issuer")).toBeDefined();
    });
  });

  describe("value-bearing operations show the asset issuer", () => {
    const renderOp = (op: Operation) =>
      render(
        <Wrapper
          routes={[ROUTES.signTransaction]}
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
          <Operations
            operations={[op] as unknown as OperationRecord[]}
            flaggedKeys={{}}
            isMemoRequired={false}
          />
        </Wrapper>,
      );

    const valueOf = (label: string) =>
      screen
        .getByText(label)
        .parentNode?.querySelector("[data-testid='OperationKeyVal__value']");

    // Regression test for HackerOne #3768317: the signing UI must show the
    // issuer for value-bearing assets so a counterfeit USDC:<attacker> is
    // distinguishable from a non-native asset using the same code.
    it("renders the issuer for the non-native asset in a manageSellOffer", async () => {
      const op = {
        offerId: "0",
        selling: Asset.native(),
        buying: new Asset("USDC", TEST_PUBLIC_KEY),
        amount: "5000",
        price: "1",
        type: "manageSellOffer",
      } as Operation.ManageSellOffer;

      renderOp(op);

      await waitFor(() => screen.getAllByTestId("OperationKeyVal"));

      expect(valueOf("Selling")).toHaveTextContent("XLM");
      expect(valueOf("Buying")).toHaveTextContent("USDC");

      // Native XLM has no issuer, so exactly one issuer row is rendered, and it
      // carries the (truncated, copyable) issuer of the non-native buying asset.
      const issuerRows = screen.getAllByText("Asset Issuer");
      expect(issuerRows).toHaveLength(1);
      expect(valueOf("Asset Issuer")).toHaveTextContent("GBTY…JZOF");
    });

    it("renders the issuer for a payment of a non-native asset", async () => {
      const op = {
        destination: TEST_PUBLIC_KEY,
        asset: new Asset("USDC", TEST_PUBLIC_KEY),
        amount: "100",
        type: "payment",
      } as Operation.Payment;

      renderOp(op);

      await waitFor(() => screen.getAllByTestId("OperationKeyVal"));

      // master renamed the payment asset-code row to "Token Code"; the issuer
      // row (added here) is unaffected by that rename.
      expect(valueOf("Token Code")).toHaveTextContent("USDC");
      expect(valueOf("Asset Issuer")).toHaveTextContent("GBTY…JZOF");
    });

    it("does not render an issuer row for a native (XLM) payment", async () => {
      const op = {
        destination: TEST_PUBLIC_KEY,
        asset: Asset.native(),
        amount: "100",
        type: "payment",
      } as Operation.Payment;

      renderOp(op);

      await waitFor(() => screen.getAllByTestId("OperationKeyVal"));

      expect(valueOf("Token Code")).toHaveTextContent("XLM");
      expect(screen.queryByText("Asset Issuer")).toBeNull();
    });
  });
});
