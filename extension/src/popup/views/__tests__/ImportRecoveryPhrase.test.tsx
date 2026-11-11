import React from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import * as ApiInternal from "@shared/api/internal";
import { Account, SecretSource, SecretSourceType } from "@shared/api/types";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { ACCOUNT_ALREADY_EXISTS_ERROR } from "@shared/constants/errors";
import { ROUTES } from "popup/constants/routes";

import { ImportRecoveryPhrase } from "../ImportRecoveryPhrase";
import { AddWallet } from "../AddWallet";
import { Wrapper } from "../../__testHelpers__";

const PUBLIC_KEY = "GDVEU3DD4KOFECV66VIHWEZOYX4ZKR3WV27L464SIIPOU2IUI3JCZA57";
const VALID_12 =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const INVALID_15 = Array(15).fill("abandon").join(" ");

const accounts: Account[] = [
  {
    id: "k1",
    sourceId: "phrase-1",
    publicKey: PUBLIC_KEY,
    name: "Account 1",
    imported: false,
  },
];
const sources: SecretSource[] = [
  {
    id: "phrase-1",
    type: SecretSourceType.PHRASE,
    label: "Seed Phrase 1",
    createdAt: 1,
  },
];

const mockEmitMetric = jest.fn();
jest.mock("helpers/metrics", () => ({
  emitScreenViewed: jest.fn(),
  emitMetric: (...args: unknown[]) => mockEmitMetric(...args),
}));

const LocationProbe = () => {
  const { pathname } = useLocation();
  return <div data-testid="location">{pathname}</div>;
};

const renderView = () =>
  render(
    <Wrapper
      routes={[ROUTES.importRecoveryPhrase]}
      state={{
        auth: {
          publicKey: PUBLIC_KEY,
          activeAccountId: "k1",
          applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
          allAccounts: accounts,
          secretSources: sources,
        },
      }}
    >
      <Routes>
        <Route
          path={ROUTES.importRecoveryPhrase}
          element={<ImportRecoveryPhrase />}
        />
        <Route path={ROUTES.addWallet} element={<LocationProbe />} />
        <Route path={ROUTES.account} element={<LocationProbe />} />
      </Routes>
    </Wrapper>,
  );

const typePhrase = (value: string) =>
  fireEvent.change(screen.getByTestId("import-phrase-input"), {
    target: { value },
  });

const toPasswordStep = async (phrase = VALID_12) => {
  typePhrase(phrase);
  fireEvent.click(screen.getByTestId("import-phrase-submit"));
  return screen.findByTestId("enter-password-input");
};

const submitPassword = async () => {
  fireEvent.change(await screen.findByTestId("enter-password-input"), {
    target: { value: "password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Import" }));
};

describe("ImportRecoveryPhrase", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockEmitMetric.mockClear();
  });

  it("disables Import while the phrase is empty", () => {
    renderView();
    expect(screen.getByTestId("import-phrase-submit")).toBeDisabled();
    typePhrase("   ");
    expect(screen.getByTestId("import-phrase-submit")).toBeDisabled();
    typePhrase(VALID_12);
    expect(screen.getByTestId("import-phrase-submit")).toBeEnabled();
  });

  it('shows "Invalid mnemonic phrase" for a 15-word phrase and stays on the phrase step', () => {
    renderView();
    typePhrase(INVALID_15);
    fireEvent.click(screen.getByTestId("import-phrase-submit"));

    expect(screen.getByText("Invalid mnemonic phrase")).toBeInTheDocument();
    expect(screen.queryByTestId("enter-password-input")).toBeNull();
  });

  it("moves a valid phrase to the password step", async () => {
    renderView();
    expect(await toPasswordStep()).toBeInTheDocument();
  });

  it("sends the normalized phrase and the password, then navigates to the account view", async () => {
    const spy = jest
      .spyOn(ApiInternal, "importRecoveryPhrase")
      .mockResolvedValue({
        publicKey: PUBLIC_KEY,
        activeAccountId: "k1",
        allAccounts: accounts,
        hasPrivateKey: true,
        secretSources: sources,
      });
    renderView();
    await toPasswordStep(`  ${VALID_12.toUpperCase().replace(/ /g, "\n ")}  `);
    await submitPassword();

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          password: "password",
          mnemonicPhrase: VALID_12,
        }),
      ),
    );
    expect(await screen.findByTestId("location")).toHaveTextContent(
      new RegExp(`^${ROUTES.account}$`),
    );
    expect(mockEmitMetric).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ source: "imported_phrase" }),
    );
  });

  it('shows "This recovery phrase is already in your wallet" on the password step when refused', async () => {
    jest
      .spyOn(ApiInternal, "importRecoveryPhrase")
      .mockRejectedValue(
        new Error("This recovery phrase is already in your wallet"),
      );
    renderView();
    await toPasswordStep();
    await submitPassword();

    expect(
      await screen.findByText("This recovery phrase is already in your wallet"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("location")).toBeNull();
  });

  it('shows "This account is already in your wallet." for ACCOUNT_ALREADY_EXISTS_ERROR', async () => {
    jest
      .spyOn(ApiInternal, "importRecoveryPhrase")
      .mockRejectedValue(new Error(ACCOUNT_ALREADY_EXISTS_ERROR));
    renderView();
    await toPasswordStep();
    await submitPassword();

    expect(
      await screen.findByText("This account is already in your wallet."),
    ).toBeInTheDocument();
  });

  it("keeps the phrase when going back from the password step", async () => {
    renderView();
    await toPasswordStep();
    fireEvent.click(screen.getByTestId("BackButton"));

    expect(await screen.findByTestId("import-phrase-input")).toHaveValue(
      VALID_12,
    );
  });

  it("does not submit twice while an import is in flight", async () => {
    let resolve: (v: unknown) => void = () => {};
    const spy = jest.spyOn(ApiInternal, "importRecoveryPhrase").mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }) as never,
    );
    renderView();
    await toPasswordStep();
    const input = await screen.findByTestId("enter-password-input");
    fireEvent.change(input, { target: { value: "password" } });
    const form = input.closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    resolve({
      publicKey: PUBLIC_KEY,
      activeAccountId: "k1",
      allAccounts: accounts,
      hasPrivateKey: true,
      secretSources: sources,
    });
  });

  it("has no Paste button", () => {
    renderView();
    expect(screen.queryByTestId("import-phrase-paste")).toBeNull();
  });

  it("clears the clipboard after a keyboard paste", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { readText: jest.fn(), writeText } });
    renderView();

    fireEvent.paste(screen.getByTestId("import-phrase-input"), {
      clipboardData: { getData: () => VALID_12 },
    });

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(""));
  });
});

describe("AddWallet", () => {
  it("lists Import Recovery Phrase second and links to the import route", () => {
    render(
      <Wrapper routes={[ROUTES.addWallet]} state={{}}>
        <Routes>
          <Route path={ROUTES.addWallet} element={<AddWallet />} />
        </Routes>
      </Wrapper>,
    );
    const rows = screen.getAllByTestId(/^add-wallet-/);
    expect(rows[1]).toHaveAttribute("data-testid", "add-wallet-import-phrase");
    expect(rows[1].getAttribute("href")).toBe(ROUTES.importRecoveryPhrase);
  });
});
