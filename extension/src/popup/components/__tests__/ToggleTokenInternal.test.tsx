import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as ApiInternal from "@shared/api/internal";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { ToggleTokenInternal } from "popup/components/manageAssets/ManageAssetRows/ToggleTokenInternal";
import { Wrapper } from "popup/__testHelpers__";

const mockFetchBalances = jest.fn();

jest.mock("helpers/hooks/useGetBalances", () => ({
  useGetBalances: () => ({ fetchData: mockFetchBalances }),
}));

jest.mock("helpers/metrics", () => ({
  emitMetric: jest.fn(),
}));

// Interpolate `t` so labels built from the token's name read as they would in
// the UI.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (str: string, opts?: Record<string, string>) =>
      Object.entries(opts || {}).reduce(
        (acc, [key, value]) => acc.replace(`{{${key}}}`, value),
        str,
      ),
  }),
}));

const CONTRACT = "CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ";
const CANONICAL = `TOK:${CONTRACT}`;
const PUBLIC_KEY = "G123";

const renderSheet = ({
  isTrustlineActive,
  onCancel,
  onSuccess,
}: {
  isTrustlineActive: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}) =>
  render(
    <Wrapper state={{}} routes={["/"]}>
      <ToggleTokenInternal
        asset={{
          code: "TOK",
          issuer: CONTRACT,
          image: null,
          isTrustlineActive,
          domain: null,
          contract: CONTRACT,
          name: "Test Token",
        }}
        networkDetails={TESTNET_NETWORK_DETAILS}
        publicKey={PUBLIC_KEY}
        onCancel={onCancel}
        onSuccess={onSuccess}
      />
    </Wrapper>,
  );

describe("ToggleTokenInternal", () => {
  beforeEach(() => {
    mockFetchBalances.mockResolvedValue({ balances: {} });
    // Nothing hidden unless a test says otherwise, so the post-add cleanup
    // (clearHiddenAssetFlag) has nothing to write.
    jest
      .spyOn(ApiInternal, "getHiddenAssets")
      .mockResolvedValue({ hiddenAssets: {}, error: "" });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("clears a stored hidden flag once the token is added", async () => {
    jest
      .spyOn(ApiInternal, "addTokenId")
      .mockResolvedValue({ tokenIdList: [CONTRACT] } as any);
    jest.spyOn(ApiInternal, "getHiddenAssets").mockResolvedValue({
      hiddenAssets: { [CANONICAL]: "hidden" },
      error: "",
    });
    const changeVisibility = jest
      .spyOn(ApiInternal, "changeAssetVisibility")
      .mockResolvedValue({ hiddenAssets: {}, error: "" });

    const onSuccess = jest.fn();
    renderSheet({ isTrustlineActive: false, onCancel: jest.fn(), onSuccess });
    await userEvent.click(screen.getByText("Confirm"));

    await waitFor(() => expect(changeVisibility).toHaveBeenCalledTimes(1));
    expect(changeVisibility).toHaveBeenCalledWith({
      assetIssuer: CANONICAL,
      assetVisibility: "visible",
      activePublicKey: PUBLIC_KEY,
      network: TESTNET_NETWORK_DETAILS.network,
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("leaves the hidden flag alone when the add fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(ApiInternal, "addTokenId").mockRejectedValue(new Error("boom"));
    jest.spyOn(ApiInternal, "getHiddenAssets").mockResolvedValue({
      hiddenAssets: { [CANONICAL]: "hidden" },
      error: "",
    });
    const changeVisibility = jest
      .spyOn(ApiInternal, "changeAssetVisibility")
      .mockResolvedValue({ hiddenAssets: {}, error: "" });

    renderSheet({
      isTrustlineActive: false,
      onCancel: jest.fn(),
      onSuccess: jest.fn(),
    });
    await userEvent.click(screen.getByText("Confirm"));

    await waitFor(() => expect(ApiInternal.addTokenId).toHaveBeenCalled());
    // The balances refetch marks the end of the confirm flow.
    await waitFor(() => expect(mockFetchBalances).toHaveBeenCalled());
    expect(changeVisibility).not.toHaveBeenCalled();
  });
});
