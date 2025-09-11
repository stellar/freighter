import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import { Address, Operation, xdr, StrKey, ScInt } from "stellar-sdk";

import { mockAccounts, TEST_PUBLIC_KEY, Wrapper } from "popup/__testHelpers__";
import { Operations } from "../signTransaction/Operations";
import * as internalApi from "@shared/api/internal";
import { ROUTES } from "popup/constants/routes";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";

describe("Operations KeyVal", () => {
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
  });
});
