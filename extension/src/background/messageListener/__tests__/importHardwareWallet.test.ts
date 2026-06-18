import { importHardwareWallet } from "../handlers/importHardwareWallet";

const mockStoreHardwareWalletAccount = jest.fn().mockResolvedValue(undefined);
const mockGetBipPath = jest.fn().mockResolvedValue("m/44'/148'/0'");

jest.mock("../helpers/store-hardware-wallet", () => ({
  storeHardwareWalletAccount: (...args: unknown[]) =>
    mockStoreHardwareWalletAccount(...args),
}));

jest.mock("background/helpers/account", () => ({
  getBipPath: (...args: unknown[]) => mockGetBipPath(...args),
  getIsHardwareWalletActive: jest.fn().mockResolvedValue(true),
}));

describe("importHardwareWallet handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Regression: HW-only imports flip the session into the "HW-active"
  // state where `buildHasPrivateKeySelector` reports the wallet as
  // unlocked, but the handler previously did not arm the idle
  // auto-lock alarm. HW-only sessions imported via this path had no
  // auto-lock at all, contradicting the PR's stated security goal.
  it("arms the idle auto-lock alarm after storing the HW account", async () => {
    const sessionStore = {
      dispatch: jest.fn(),
      getState: jest.fn().mockReturnValue({
        session: { publicKey: "GBHW", allAccounts: [], isHardwareWalletLocked: false },
      }),
    } as any;
    const localStore = {
      getItem: jest.fn().mockResolvedValue("hw:GBHW"),
    } as any;
    const sessionTimer = {
      startSession: jest.fn().mockResolvedValue(undefined),
    } as any;

    await importHardwareWallet({
      request: {
        publicKey: "GBHW",
        hardwareWalletType: "Ledger",
        bipPath: "m/44'/148'/0'",
      } as any,
      sessionStore,
      localStore,
      sessionTimer,
    });

    expect(mockStoreHardwareWalletAccount).toHaveBeenCalledTimes(1);
    expect(sessionTimer.startSession).toHaveBeenCalledTimes(1);
    // Account is stored before the timer arms so the alarm fires
    // relative to an already-active HW session, not a future one.
    expect(
      mockStoreHardwareWalletAccount.mock.invocationCallOrder[0],
    ).toBeLessThan(sessionTimer.startSession.mock.invocationCallOrder[0]);
  });
});
