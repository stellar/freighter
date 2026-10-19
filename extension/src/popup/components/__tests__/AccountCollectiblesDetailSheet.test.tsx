import React from "react";
import { render, act, screen, fireEvent } from "@testing-library/react";

import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { AccountCollectibles } from "popup/components/account/AccountCollectibles";
import { SLIDEUP_MODAL_TRANSITION_MS } from "popup/components/SlideupModal";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";
import { ROUTES } from "popup/constants/routes";
import { mockAccounts, mockCollectibles, Wrapper } from "../../__testHelpers__";

// The real detail sheet fetches metadata and owns its own sub-sheets; none of
// that is what this file exercises. The stub reports which collectible it was
// handed, which is exactly the state the close timer can corrupt.
jest.mock("popup/components/account/CollectibleDetail", () => ({
  CollectibleDetail: ({
    selectedCollectible,
    handleItemClose,
  }: {
    selectedCollectible: { collectionAddress: string; tokenId: string };
    handleItemClose: () => void;
  }) => (
    <div data-testid="collectible-detail-stub">
      <span data-testid="collectible-detail-token-id">
        {selectedCollectible.tokenId}
      </span>
      <button
        type="button"
        data-testid="collectible-detail-close"
        onClick={handleItemClose}
      >
        close
      </button>
    </div>
  ),
}));

const mockRefreshHiddenCollectibles = jest.fn().mockResolvedValue(undefined);
const mockIsCollectibleHidden = jest.fn().mockReturnValue(false);

const renderCollectibles = () =>
  render(
    <Wrapper
      routes={[ROUTES.account]}
      state={{
        auth: {
          error: null,
          applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
          publicKey: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
          allAccounts: mockAccounts,
        },
        settings: {
          networkDetails: TESTNET_NETWORK_DETAILS,
          networksList: DEFAULT_NETWORKS,
          isHideDustEnabled: false,
        },
        cache: {
          balanceData: {
            [TESTNET_NETWORK_DETAILS.network]: { G1: { balances: {} } },
          },
          icons: {},
          homeDomains: {},
          tokenLists: [],
          tokenDetails: {},
          historyData: {},
          tokenPrices: {},
          collections: {},
        },
      }}
    >
      <AccountCollectibles
        collections={mockCollectibles}
        hasInlineCta={false}
        isLoading={false}
        refreshHiddenCollectibles={mockRefreshHiddenCollectibles}
        isCollectibleHidden={mockIsCollectibleHidden}
      />
    </Wrapper>,
  );

describe("AccountCollectibles detail sheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("keeps a collectible reopened during the close animation", () => {
    renderCollectibles();

    const items = screen.getAllByTestId("account-collectible-image");

    // Open the first collectible.
    fireEvent.click(items[0]);
    expect(screen.getByTestId("collectible-detail-token-id")).toHaveTextContent(
      "1",
    );

    // Close it, then reopen a different one inside the exit transition. The
    // backdrop stops taking clicks as soon as the sheet starts sliding out, so
    // the grid underneath is reachable for the whole window.
    fireEvent.click(screen.getByTestId("collectible-detail-close"));
    fireEvent.click(items[1]);
    expect(screen.getByTestId("collectible-detail-token-id")).toHaveTextContent(
      "2",
    );

    // The cleanup queued by the close must not land on the reopened sheet.
    act(() => {
      jest.advanceTimersByTime(SLIDEUP_MODAL_TRANSITION_MS * 2);
    });

    expect(screen.getByTestId("collectible-detail-stub")).toBeDefined();
    expect(screen.getByTestId("collectible-detail-token-id")).toHaveTextContent(
      "2",
    );
  });
});
