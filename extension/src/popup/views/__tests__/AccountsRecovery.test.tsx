import React from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { Account } from "@shared/api/types";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { WalletType } from "@shared/constants/hardwareWallet";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { ROUTES } from "popup/constants/routes";

import { AccountsRecovery } from "../AccountsRecovery";
import { Settings } from "../Settings";
import { Wrapper } from "../../__testHelpers__";

const DERIVED_1 = "GDVEU3DD4KOFECV66VIHWEZOYX4ZKR3WV27L464SIIPOU2IUI3JCZA57";
const DERIVED_2 = "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
const IMPORTED_1 = "GD6ROJBYLKQMOW3E7N4M2YBPUHMZD7PL65VRHRMO24BOVSBV5H3BQRSL";
const IMPORTED_2 = "GA7YNBW5CBTJZ3ZZOWX3ZNBKD6OE7A7IHUQVWMY62W2ZBG2SGZVOOPVH";
const LEDGER = "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH";

const accounts: Account[] = [
  { publicKey: DERIVED_1, name: "Account 1", imported: false },
  { publicKey: IMPORTED_1, name: "Account 2", imported: true },
  { publicKey: DERIVED_2, name: "Account 3", imported: false },
  {
    publicKey: LEDGER,
    name: "Account 4",
    imported: false,
    hardwareWalletType: WalletType.LEDGER,
  },
  { publicKey: IMPORTED_2, name: "Account 5", imported: true },
] as Account[];

let mockWalletsState: unknown;
jest.mock(
  "popup/components/account/AccountSheet/hooks/useGetWalletsData",
  () => ({
    useGetWalletsData: () => ({
      state: mockWalletsState,
      fetchData: jest.fn(),
    }),
  }),
);

jest.mock("helpers/metrics", () => ({
  emitScreenViewed: jest.fn(),
  emitMetric: jest.fn(),
}));

const LocationProbe = () => {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{`${pathname}${search}`}</div>;
};

describe("AccountsRecovery", () => {
  beforeEach(() => {
    mockWalletsState = {
      state: RequestState.SUCCESS,
      data: {
        type: AppDataType.RESOLVED,
        publicKey: DERIVED_2,
        allAccounts: accounts,
        accountValue: { [DERIVED_1]: "$1,149.23", [IMPORTED_1]: "$0.00" },
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
        isFetchingTokenPrices: false,
      },
    };
  });

  const renderList = () =>
    render(
      <Wrapper routes={[ROUTES.accountsRecovery]}>
        <Routes>
          <Route
            path={ROUTES.accountsRecovery}
            element={<AccountsRecovery />}
          />
          <Route path={ROUTES.editAccount} element={<LocationProbe />} />
        </Routes>
      </Wrapper>,
    );

  it("lists every account once, under its group, with balances", () => {
    renderList();

    const groups = screen.getAllByTestId("accounts-recovery-group");
    expect(groups).toHaveLength(4);
    expect(screen.getAllByTestId("accounts-recovery-row")).toHaveLength(5);

    const phrase = within(groups[0]);
    expect(phrase.getByText(/^Recovery phrase/)).toBeInTheDocument();
    expect(phrase.getByText("Account 1")).toBeInTheDocument();
    expect(phrase.getByText("$1,149.23")).toBeInTheDocument();
    expect(phrase.getByText("Account 3")).toBeInTheDocument();
  });

  it("marks the active account", () => {
    renderList();

    const current = screen
      .getAllByTestId("accounts-recovery-row")
      .filter((row) => row.getAttribute("aria-current") === "true");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("Account 3");
  });

  it("opens Edit account for the row's account", () => {
    renderList();

    const rows = screen.getAllByTestId("accounts-recovery-row");
    const imported = rows.find((row) =>
      row.textContent?.includes("Account 2"),
    )!;
    fireEvent.click(within(imported).getByTestId("accounts-recovery-edit"));

    expect(screen.getByTestId("location")).toHaveTextContent(
      `${ROUTES.editAccount}?publicKey=${IMPORTED_1}`,
    );
  });
});

describe("Settings", () => {
  it("opens Accounts & recovery from the card at the top", () => {
    render(
      <Wrapper
        routes={[ROUTES.settings]}
        state={{
          auth: {
            publicKey: DERIVED_1,
            applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
            allAccounts: accounts,
          },
          settings: { networkDetails: TESTNET_NETWORK_DETAILS },
        }}
      >
        <Routes>
          <Route path={ROUTES.settings} element={<Settings />} />
          <Route path={ROUTES.accountsRecovery} element={<LocationProbe />} />
        </Routes>
      </Wrapper>,
    );

    fireEvent.click(screen.getByTestId("settings-accounts-recovery"));

    expect(screen.getByTestId("location")).toHaveTextContent(
      ROUTES.accountsRecovery,
    );
  });
});
