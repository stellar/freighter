import React from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import * as ApiInternal from "@shared/api/internal";
import { Account, SecretSource, SecretSourceType } from "@shared/api/types";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { ROUTES } from "popup/constants/routes";

import { CreateWallet } from "../CreateWallet";
import { AddWallet } from "../AddWallet";
import { Wrapper } from "../../__testHelpers__";

const DERIVED_1 = "GDVEU3DD4KOFECV66VIHWEZOYX4ZKR3WV27L464SIIPOU2IUI3JCZA57";
const DERIVED_2 = "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
const IMPORTED_1 = "GD6ROJBYLKQMOW3E7N4M2YBPUHMZD7PL65VRHRMO24BOVSBV5H3BQRSL";
const PHRASE =
  "bloom student label strategy tattoo promote brand mushroom problem divert carbon erode";

const phraseSources: SecretSource[] = [
  {
    id: "phrase-1",
    type: SecretSourceType.PHRASE,
    label: "Seed Phrase 1",
    createdAt: 1,
  },
  {
    id: "key-1",
    type: SecretSourceType.SECRET_KEY,
    label: "Secret Key 1",
    createdAt: 2,
  },
  {
    id: "phrase-2",
    type: SecretSourceType.PHRASE,
    label: "Seed Phrase 2",
    createdAt: 3,
  },
];

const twoPhraseAccounts: Account[] = [
  {
    id: "k1",
    sourceId: "phrase-1",
    publicKey: DERIVED_1,
    name: "Account 1",
    imported: false,
  },
  {
    id: "k2",
    sourceId: "key-1",
    publicKey: IMPORTED_1,
    name: "Account 2",
    imported: true,
  },
  {
    id: "k3",
    sourceId: "phrase-2",
    publicKey: DERIVED_2,
    name: "Account 3",
    imported: false,
  },
];

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
  const { pathname } = useLocation();
  return <div data-testid="location">{pathname}</div>;
};

const added = (allAccounts: Account[], sources: SecretSource[]) => ({
  publicKey: allAccounts[allAccounts.length - 1].publicKey,
  activeAccountId: allAccounts[allAccounts.length - 1].id,
  allAccounts,
  hasPrivateKey: true,
  secretSources: sources,
});

const renderView = ({
  accounts,
  sources,
}: {
  accounts: Account[];
  sources: SecretSource[];
}) => {
  mockWalletsState = {
    state: RequestState.SUCCESS,
    data: {
      type: AppDataType.RESOLVED,
      publicKey: accounts[0].publicKey,
      allAccounts: accounts,
      accountValue: {},
      applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      isFetchingTokenPrices: false,
    },
  };

  return render(
    <Wrapper
      routes={[ROUTES.createWallet]}
      state={{
        auth: {
          publicKey: accounts[0].publicKey,
          activeAccountId: accounts[0].id,
          applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
          allAccounts: accounts,
          secretSources: sources,
        },
      }}
    >
      <Routes>
        <Route path={ROUTES.createWallet} element={<CreateWallet />} />
        <Route path={ROUTES.account} element={<LocationProbe />} />
      </Routes>
    </Wrapper>,
  );
};

const enterPassword = async () => {
  fireEvent.change(await screen.findByTestId("enter-password-input"), {
    target: { value: "password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
};

describe("CreateWallet", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("lists each recovery phrase with its accounts, then Generate", () => {
    renderView({ accounts: twoPhraseAccounts, sources: phraseSources });

    const groups = screen.getAllByTestId("create-wallet-group");
    // Test i18n leaves the number placeholder as is.
    expect(groups).toHaveLength(2);
    groups.forEach((g) =>
      expect(g.firstChild?.textContent).toMatch(/^Recovery phrase/),
    );
    expect(within(groups[0]).getByText("Account 1")).toBeInTheDocument();
    expect(within(groups[1]).getByText("Account 3")).toBeInTheDocument();
    // The imported key is not a phrase and has nothing to add under.
    expect(screen.queryByText("Account 2")).not.toBeInTheDocument();
    expect(screen.getByTestId("create-wallet-generate")).toBeInTheDocument();
  });

  it("adds under the phrase the user picked, with the name they set", async () => {
    const spy = jest.spyOn(ApiInternal, "addAccount").mockResolvedValue(
      added(
        [
          ...twoPhraseAccounts,
          {
            id: "k4",
            sourceId: "phrase-2",
            publicKey: DERIVED_1,
            name: "Trading",
            imported: false,
          },
        ],
        phraseSources,
      ),
    );
    renderView({ accounts: twoPhraseAccounts, sources: phraseSources });

    const groups = screen.getAllByTestId("create-wallet-group");
    fireEvent.click(within(groups[1]).getByTestId("create-wallet-add-account"));

    const input = await screen.findByTestId("set-account-name-input");
    expect(input).toHaveValue("Account 4");
    fireEvent.change(input, { target: { value: "Trading" } });
    fireEvent.click(screen.getByTestId("set-account-name-submit"));

    await enterPassword();

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          password: "password",
          sourceId: "phrase-2",
          accountName: "Trading",
        }),
      ),
    );
    expect(await screen.findByTestId("location")).toHaveTextContent("/");
  });

  it("shows only Generate in a wallet with no phrase", () => {
    renderView({
      accounts: [twoPhraseAccounts[1]],
      sources: [phraseSources[1]],
    });

    expect(screen.queryAllByTestId("create-wallet-group")).toHaveLength(0);
    expect(screen.getByTestId("create-wallet-generate")).toBeInTheDocument();
  });

  it("generates a phrase, hides it until asked, then stores it", async () => {
    jest
      .spyOn(ApiInternal, "generateRecoveryPhrase")
      .mockResolvedValue({ mnemonicPhrase: PHRASE, pendingPhraseId: "gen-1" });
    const spy = jest
      .spyOn(ApiInternal, "addRecoveryPhraseSource")
      .mockResolvedValue(
        added(
          [
            twoPhraseAccounts[1],
            {
              id: "k9",
              sourceId: "phrase-new",
              publicKey: DERIVED_1,
              name: "Account 2",
              imported: false,
            },
          ],
          phraseSources,
        ),
      );
    renderView({
      accounts: [twoPhraseAccounts[1]],
      sources: [phraseSources[1]],
    });

    fireEvent.click(screen.getByTestId("create-wallet-generate"));
    expect(
      await screen.findByTestId("set-account-name-submit"),
    ).toHaveTextContent("Next");
    fireEvent.click(screen.getByTestId("set-account-name-submit"));

    const grid = await screen.findByTestId("create-wallet-phrase");
    expect(grid).not.toHaveTextContent("bloom");

    fireEvent.click(screen.getByTestId("create-wallet-phrase-reveal"));
    expect(screen.getByTestId("create-wallet-phrase")).toHaveTextContent(
      "bloom",
    );

    fireEvent.click(screen.getByTestId("create-wallet-phrase-create"));
    await enterPassword();

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          password: "password",
          // "Account 2" is taken by the imported key.
          accountName: "Account 3",
          pendingPhraseId: "gen-1",
        }),
      ),
    );
    expect(spy.mock.calls[0][0]).not.toHaveProperty("mnemonicPhrase");
    expect(await screen.findByTestId("location")).toHaveTextContent("/");
  });

  it("keeps the user on the password step when the add fails", async () => {
    jest
      .spyOn(ApiInternal, "addAccount")
      .mockRejectedValue(new Error("Incorrect password"));
    renderView({ accounts: twoPhraseAccounts, sources: phraseSources });

    fireEvent.click(
      within(screen.getAllByTestId("create-wallet-group")[0]).getByTestId(
        "create-wallet-add-account",
      ),
    );
    fireEvent.click(await screen.findByTestId("set-account-name-submit"));
    await enterPassword();

    expect(await screen.findByText("Incorrect password")).toBeInTheDocument();
    expect(screen.queryByTestId("location")).not.toBeInTheDocument();
  });
});

describe("AddWallet", () => {
  it("offers create, secret key import and hardware, in that order", () => {
    render(
      <Wrapper routes={[ROUTES.addWallet]} state={{}}>
        <Routes>
          <Route path={ROUTES.addWallet} element={<AddWallet />} />
          <Route path={ROUTES.createWallet} element={<LocationProbe />} />
        </Routes>
      </Wrapper>,
    );

    expect(
      [
        "add-wallet-create",
        "add-wallet-import-secret-key",
        "add-wallet-connect-hardware",
      ].map((id) => screen.getByTestId(id).getAttribute("href")),
    ).toEqual([
      ROUTES.createWallet,
      ROUTES.importAccount,
      ROUTES.connectWallet,
    ]);

    fireEvent.click(screen.getByTestId("add-wallet-create"));
    expect(screen.getByTestId("location")).toHaveTextContent(
      ROUTES.createWallet,
    );
  });
});
