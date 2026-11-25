import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { emitScreenViewed } from "helpers/metrics";
import { Earn } from "popup/views/Earn";
import { initialState as earnInitialState } from "popup/ducks/earn";
import { Wrapper } from "popup/__testHelpers__";

const TEST_PUBLIC_KEY =
  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";

// The background read of the persisted flag, held open so each test decides
// when, and to what, it resolves.
let mockResolveIntroSeen: (seen: boolean) => void = () => {};
jest.mock("@shared/api/internal", () => ({
  ...jest.requireActual("@shared/api/internal"),
  getHasSeenEarnIntro: () =>
    new Promise<boolean>((resolve) => {
      mockResolveIntroSeen = resolve;
    }),
  dismissEarnIntro: () => Promise.resolve(true),
}));

jest.mock("popup/components/earn/EarnIntro", () => ({
  EarnIntro: ({ onStart }: { onStart: () => void }) => (
    <button data-testid="stub-intro" onClick={onStart}>
      start
    </button>
  ),
}));

jest.mock("popup/components/earn/EarnTokenPicker", () => ({
  EarnTokenPicker: () => <div data-testid="stub-picker" />,
}));

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
  emitScreenViewed: jest.fn(),
}));

const screenViews = () =>
  (emitScreenViewed as jest.Mock).mock.calls.map(([name]) => name);

const renderEarn = () =>
  render(
    <Wrapper
      routes={["/earn"]}
      state={{
        auth: { allAccounts: [TEST_PUBLIC_KEY], publicKey: TEST_PUBLIC_KEY },
        settings: { networkDetails: TESTNET_NETWORK_DETAILS },
        earn: { ...earnInitialState, hasSeenIntro: null },
      }}
    >
      <Earn />
    </Wrapper>,
  );

const resolveIntroSeen = (seen: boolean) =>
  act(async () => {
    mockResolveIntroSeen(seen);
  });

describe("Earn intro", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows nothing and reports nothing before the intro flag resolves", () => {
    renderEarn();

    expect(screen.queryByTestId("stub-intro")).toBeNull();
    expect(screen.queryByTestId("stub-picker")).toBeNull();
    expect(emitScreenViewed).not.toHaveBeenCalled();
  });

  it("opens a first visit on the intro, then the picker", async () => {
    renderEarn();
    await resolveIntroSeen(false);

    expect(screen.getByTestId("stub-intro")).toBeInTheDocument();
    expect(screen.queryByTestId("stub-picker")).toBeNull();
    expect(screenViews()).toEqual(["earn_intro"]);

    await userEvent.click(screen.getByTestId("stub-intro"));

    expect(screen.getByTestId("stub-picker")).toBeInTheDocument();
    expect(screenViews()).toEqual(["earn_intro", "earn_select_token"]);
  });

  it("opens a returning visit on the picker without the intro", async () => {
    renderEarn();
    await resolveIntroSeen(true);

    expect(screen.getByTestId("stub-picker")).toBeInTheDocument();
    expect(screen.queryByTestId("stub-intro")).toBeNull();
    expect(screenViews()).toEqual(["earn_select_token"]);
  });
});
