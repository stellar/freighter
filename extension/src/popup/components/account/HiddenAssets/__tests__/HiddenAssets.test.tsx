import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

import * as ApiInternal from "@shared/api/internal";
import * as DomainsHook from "helpers/hooks/useGetAssetDomainsWithBalances";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { Wrapper, mockAccounts, getTestStore } from "popup/__testHelpers__";
import { HiddenAssets } from "popup/components/account/HiddenAssets";
import { ROUTES } from "popup/constants/routes";
import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
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
    jest.spyOn(ApiInternal, "getHiddenAssets").mockResolvedValue({
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

  // The dangerous shape of failure is the quiet one: persisting the empty map
  // that comes back with an error would define the redux key, so the sheet
  // would claim nothing is hidden and never retry on reopen.
  it("reports a structured error instead of claiming nothing is hidden", async () => {
    jest
      .spyOn(ApiInternal, "getHiddenAssets")
      .mockResolvedValue({ hiddenAssets: {}, error: "boom" } as any);
    mockDomains([{ code: "KALE", issuer: ISSUER, domain: "kalepail.com" }]);
    renderSheet();

    await waitFor(() =>
      expect(
        screen.getByText(/Unable to load hidden tokens/),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("HiddenAssets__empty")).not.toBeInTheDocument();
  });

  // Without a catch the rejection is unhandled and the redux key stays
  // undefined, which the loader reads as "still loading" -- forever.
  it("does not spin forever when the message rejects", async () => {
    jest
      .spyOn(ApiInternal, "getHiddenAssets")
      .mockRejectedValue(new Error("no background"));
    mockDomains([{ code: "KALE", issuer: ISSUER, domain: "kalepail.com" }]);
    renderSheet();

    await waitFor(() =>
      expect(
        screen.getByText(/Unable to load hidden tokens/),
      ).toBeInTheDocument(),
    );
  });

  // FETCH_DATA_ERROR nulls `data`, so the sheet loses its publicKey and never
  // loads a visibility map. Left floating, the rejection was unhandled and the
  // third loader clause stayed true with nothing on screen to say why.
  it("surfaces a failed domains fetch instead of spinning", async () => {
    const rejectingFetch = jest
      .fn()
      .mockRejectedValue(new Error("Failed to fetch domains"));
    jest.spyOn(DomainsHook, "useGetAssetDomainsWithBalances").mockReturnValue({
      state: { state: RequestState.ERROR, data: null, error: "boom" },
      fetchData: rejectingFetch,
    } as any);

    renderSheet();

    await waitFor(() =>
      expect(
        screen.getByText(/Unable to load hidden tokens/),
      ).toBeInTheDocument(),
    );
    // The point of the fix: the loader has to stop. Before it, `data` was null,
    // so the visibility map never loaded and this spun with no message.
    expect(
      screen.queryByTestId("HiddenAssets__loader"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("HiddenAssets__empty")).not.toBeInTheDocument();
  });

  it("mirrors the visibility map under the network the background reports", async () => {
    // The request carries no network, so a switch committing mid-flight answers
    // with the other network's map. Filing it under the network this render
    // captured would be read as loaded and never re-fetched.
    jest.spyOn(ApiInternal, "getHiddenAssets").mockResolvedValue({
      hiddenAssets: { [KALE]: "hidden" },
      networkName: MAINNET_NETWORK_DETAILS.networkName,
      error: "",
    } as any);
    mockDomains([{ code: "KALE", issuer: ISSUER, domain: "kalepail.com" }]);
    renderSheet();

    await waitFor(() => {
      const mirror = (
        getTestStore()?.getState() as {
          hiddenAssets: {
            hiddenAssets: Record<string, Record<string, unknown>>;
          };
        }
      ).hiddenAssets.hiddenAssets;
      expect(mirror[MAINNET_NETWORK_DETAILS.networkName]?.["G1"]).toEqual({
        [KALE]: "hidden",
      });
    });

    const mirror = (
      getTestStore()?.getState() as {
        hiddenAssets: {
          hiddenAssets: Record<string, Record<string, unknown>>;
        };
      }
    ).hiddenAssets.hiddenAssets;
    expect(mirror[TESTNET_NETWORK_DETAILS.networkName]).toBeUndefined();
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
