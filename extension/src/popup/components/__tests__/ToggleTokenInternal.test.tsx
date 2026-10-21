import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

import * as ApiInternal from "@shared/api/internal";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { ToggleTokenInternal } from "popup/components/manageAssets/ManageAssetRows/ToggleTokenInternal";
import { ROUTES } from "popup/constants/routes";
import {
  Wrapper,
  mockAccounts,
  mockBalances,
  TEST_PUBLIC_KEY,
} from "popup/__testHelpers__";

const CONTRACT = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
const CANONICAL = `KALE:${CONTRACT}`;

const renderComponent = () =>
  render(
    <Wrapper
      routes={[ROUTES.manageAssets]}
      state={{
        auth: {
          allAccounts: mockAccounts,
          publicKey: TEST_PUBLIC_KEY,
        },
        settings: {
          networkDetails: TESTNET_NETWORK_DETAILS,
        },
      }}
    >
      <ToggleTokenInternal
        asset={{
          code: "KALE",
          issuer: "",
          image: null,
          isTrustlineActive: false,
          domain: null,
          contract: CONTRACT,
        }}
        networkDetails={TESTNET_NETWORK_DETAILS}
        onCancel={jest.fn()}
        publicKey={TEST_PUBLIC_KEY}
      />
    </Wrapper>,
  );

describe("ToggleTokenInternal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(ApiInternal, "getAccountBalances")
      .mockImplementation(() => Promise.resolve(mockBalances as any));
    jest.spyOn(ApiInternal, "getHiddenAssets").mockImplementation(() =>
      Promise.resolve({
        hiddenAssets: { [CANONICAL]: "hidden" },
        error: "",
      }),
    );
  });

  it("clears a stored hidden flag once the token is added", async () => {
    jest
      .spyOn(ApiInternal, "addTokenId")
      .mockImplementation(() => Promise.resolve({ tokenIdList: [CONTRACT] }));
    const changeVisibility = jest
      .spyOn(ApiInternal, "changeAssetVisibility")
      .mockImplementation(() =>
        Promise.resolve({ hiddenAssets: {}, error: "" }),
      );

    renderComponent();
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => expect(changeVisibility).toHaveBeenCalledTimes(1));
    expect(changeVisibility).toHaveBeenCalledWith({
      assetIssuer: CANONICAL,
      assetVisibility: "visible",
      activePublicKey: TEST_PUBLIC_KEY,
      network: TESTNET_NETWORK_DETAILS.network,
    });
  });

  it("leaves the hidden flag alone when the add fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const addToken = jest
      .spyOn(ApiInternal, "addTokenId")
      .mockImplementation(() => Promise.reject(new Error("add failed")));
    const changeVisibility = jest
      .spyOn(ApiInternal, "changeAssetVisibility")
      .mockImplementation(() =>
        Promise.resolve({ hiddenAssets: {}, error: "" }),
      );

    renderComponent();
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => expect(addToken).toHaveBeenCalled());
    // The balances refetch marks the end of the confirm flow
    await waitFor(() =>
      expect(ApiInternal.getAccountBalances).toHaveBeenCalled(),
    );
    expect(changeVisibility).not.toHaveBeenCalled();
  });
});
