import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

import * as ApiInternal from "@shared/api/internal";
import * as DomainsHook from "helpers/hooks/useGetAssetDomainsWithBalances";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { Wrapper, mockAccounts } from "popup/__testHelpers__";
import { HiddenAssets } from "popup/components/account/HiddenAssets";
import { ROUTES } from "popup/constants/routes";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const KALE = `KALE:${ISSUER}`;

const fetchData = jest.fn().mockResolvedValue(undefined);

const mockDomains = (domains: any[]) =>
  jest.spyOn(DomainsHook, "useGetAssetDomainsWithBalances").mockReturnValue({
    state: {
      state: RequestState.SUCCESS,
      data: {
        type: AppDataType.RESOLVED,
        publicKey: "G1",
        networkDetails: TESTNET_NETWORK_DETAILS,
        domains,
        balances: { balances: [] },
        isManagingAssets: true,
        applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
      },
      error: null,
    },
    fetchData,
  } as any);

const renderSheet = () =>
  render(
    <Wrapper
      routes={[ROUTES.searchAsset]}
      state={{
        auth: {
          error: null,
          applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
          publicKey: "G1",
          hasPrivateKey: true,
          allAccounts: mockAccounts,
        },
        settings: { networkDetails: TESTNET_NETWORK_DETAILS },
      }}
    >
      <HiddenAssets isOpen onClose={() => {}} />
    </Wrapper>,
  );

describe("HiddenAssets", () => {
  beforeEach(() => {
    fetchData.mockClear();
    jest
      .spyOn(ApiInternal, "getHiddenAssets")
      .mockResolvedValue({
        hiddenAssets: { [KALE]: "hidden" },
        error: "",
      } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // A cache-busting fetch changes the balances cache identity, which makes
  // SearchAsset re-fetch, early-return <Loading />, and unmount this sheet --
  // it then remounts with isOpen still true and fetches again, forever.
  it("fetches from cache so it does not bust the balances cache", async () => {
    mockDomains([]);
    renderSheet();

    await waitFor(() => expect(fetchData).toHaveBeenCalled());
    expect(fetchData).toHaveBeenCalledWith(true);
  });

  it("loads the visibility map itself rather than waiting on another screen", async () => {
    // useGetBalances only reads the map through to redux when filtering, and
    // this sheet asks for showHidden: true -- so without its own load it would
    // sit on the loader forever.
    mockDomains([{ code: "KALE", issuer: ISSUER, domain: "kalepail.com" }]);
    renderSheet();

    await waitFor(() =>
      expect(screen.getByTestId("HiddenAssets__row-KALE")).toBeInTheDocument(),
    );
    expect(ApiInternal.getHiddenAssets).toHaveBeenCalledWith({
      activePublicKey: "G1",
    });
  });

  it("shows the empty state once loaded with nothing hidden", async () => {
    jest
      .spyOn(ApiInternal, "getHiddenAssets")
      .mockResolvedValue({ hiddenAssets: {}, error: "" } as any);
    mockDomains([{ code: "KALE", issuer: ISSUER, domain: "kalepail.com" }]);
    renderSheet();

    await waitFor(() =>
      expect(screen.getByTestId("HiddenAssets__empty")).toBeInTheDocument(),
    );
  });

  it("unhides a row", async () => {
    const changeAssetVisibility = jest
      .spyOn(ApiInternal, "changeAssetVisibility")
      .mockResolvedValue({ hiddenAssets: {}, error: "" } as any);
    mockDomains([{ code: "KALE", issuer: ISSUER, domain: "kalepail.com" }]);
    renderSheet();

    fireEvent.click(await screen.findByTestId("HiddenAssets__unhide-KALE"));

    await waitFor(() =>
      expect(changeAssetVisibility).toHaveBeenCalledWith({
        assetKey: KALE,
        assetVisibility: "visible",
        activePublicKey: "G1",
      }),
    );
    // The row disappears once the mirror updates.
    await waitFor(() =>
      expect(screen.getByTestId("HiddenAssets__empty")).toBeInTheDocument(),
    );
  });
});
