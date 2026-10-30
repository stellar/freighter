import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { useSelector } from "react-redux";

import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";
import { ROUTES } from "popup/constants/routes";
import { SwapSource } from "popup/constants/swap";
import {
  initialState as transactionSubmissionInitialState,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";
import { Swap } from "popup/views/Swap";

import { Wrapper, mockAccounts } from "../../__testHelpers__";

const publicKey = "GCXRLIZUQNZ3YYJDGX6Z445P7FG5WXT7UILBO5CFIYYM7Z7YTIOELC6O";

/** `swapSource` has no UI — it rides on `swap.completed` at submit time. */
const SwapSourceProbe = () => {
  const { swapSource } = useSelector(transactionDataSelector);
  return <div data-testid="swap-source-probe">{swapSource ?? "none"}</div>;
};

const renderSwap = (
  search: string,
  preloadedSource: SwapSource | null = null,
) =>
  render(
    <Wrapper
      routes={[`${ROUTES.swap}${search}`]}
      state={{
        auth: {
          error: null,
          applicationState: ApplicationState.PASSWORD_CREATED,
          publicKey,
          allAccounts: mockAccounts,
          hasPrivateKey: true,
        },
        settings: {
          networkDetails: TESTNET_NETWORK_DETAILS,
          networksList: DEFAULT_NETWORKS,
        },
        transactionSubmission: {
          ...transactionSubmissionInitialState,
          transactionData: {
            ...transactionSubmissionInitialState.transactionData,
            swapSource: preloadedSource,
          },
        },
      }}
    >
      <Swap />
      <SwapSourceProbe />
    </Wrapper>,
  );

describe("Swap — ?source= to swapSource", () => {
  it("records a whitelisted source", async () => {
    renderSwap(`?source=${SwapSource.TokenDetails}`);
    await waitFor(() =>
      expect(screen.getByTestId("swap-source-probe")).toHaveTextContent(
        SwapSource.TokenDetails,
      ),
    );
  });

  it("lets the mount reset clear a source the query param does not re-set", async () => {
    renderSwap("?source=token_details_evil", SwapSource.TokenDetails);
    await waitFor(() =>
      expect(screen.getByTestId("swap-source-probe")).toHaveTextContent("none"),
    );
  });
});
