import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import * as createStellarIdenticon from "stellar-identicon-js";

import * as Stellar from "helpers/stellar";

import { SignTransaction } from "../SignTransaction";

import { Wrapper } from "../../__testHelpers__";

jest.mock("stellar-identicon-js");

const defaultSettingsState = {
  networkDetails: {
    isTestnet: false,
    network: "",
    networkName: "",
    otherNetworkName: "",
    networkUrl: "",
    networkPassphrase: "foo",
  },
};

const mockTransactionInfo = {
  accountToSign: "",
  transaction: {
    networkPassphrase: "foo",
    _operations: [
      {
        flags: {
          authorized: true,
          authorizedToMaintainLiabilities: false,
          clawbackEnabled: undefined,
        },
      },
    ],
  },
  transactionXdr: "",
  domain: "",
  domainTitle: "",
  isHttpsDomain: true,
  operations: [],
  operationTypes: [],
  isDomainListedAllowed: true,
  flaggedKeys: { test: { tags: [""] } },
};

jest.mock("stellar-sdk", () => {
  const original = jest.requireActual("stellar-sdk");
  return {
    ...original,
    TransactionBuilder: {
      fromXDR: () => mockTransactionInfo.transaction,
    },
  };
});

describe("SignTransactions", () => {
  beforeEach(() => {
    const mockCanvas = document.createElement("canvas");
    jest.spyOn(createStellarIdenticon, "default").mockReturnValue(mockCanvas);
  });
  it("renders", async () => {
    jest
      .spyOn(Stellar, "getTransactionInfo")
      .mockImplementation(() => mockTransactionInfo);

    render(
      <Wrapper
        state={{
          settings: defaultSettingsState,
        }}
      >
        <SignTransaction />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("SignTransaction"));
    expect(screen.getByTestId("SignTransaction")).toBeDefined();
  });
  it("shows non-https domain error", async () => {
    jest.spyOn(Stellar, "getTransactionInfo").mockImplementation(() => ({
      ...mockTransactionInfo,
      isHttpsDomain: false,
    }));
    render(
      <Wrapper
        state={{
          settings: defaultSettingsState,
        }}
      >
        <SignTransaction />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("WarningMessage"));
    expect(screen.queryByTestId("SignTransaction")).toBeNull();
    expect(screen.getByTestId("WarningMessage")).toHaveTextContent(
      "WEBSITE CONNECTION IS NOT SECURE",
    );
  });
});
