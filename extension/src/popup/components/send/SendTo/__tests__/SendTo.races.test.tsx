import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Federation } from "stellar-sdk";
import { SendTo } from "..";
import { saveDestination } from "popup/ducks/transactionSubmission";

const mockPayer = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const mockAlice = "GBHKTFVBDUA6RYP5JM4SPZ76OXYAAHV4QHUOFV4S4TK342FMVGPHA2WN";
const mockBob = "GBES5UHJYI445RV4XBGWHZOMBW4RYXBHOX47ZNZAJZAH2WP42ZEP2DYQ";
const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: () => unknown) => selector(),
}));
jest.mock("popup/ducks/accountServices", () => ({
  publicKeySelector: () => mockPayer,
  allAccountsSelector: () => [{ publicKey: mockBob, name: "Other wallet" }],
}));
jest.mock("popup/ducks/transactionSubmission", () => ({
  transactionDataSelector: () => ({
    destination: "",
    federationAddress: "",
    asset: "native",
    isCollectible: false,
  }),
  saveDestination: jest.fn((value) => ({ type: "destination", value })),
  saveDestinationAsset: jest.fn(),
  saveFederationAddress: jest.fn(),
  saveMemoAndType: jest.fn(),
  saveRecipientName: jest.fn(),
}));
jest.mock("helpers/hooks/useGetBalances", () => ({
  useGetBalances: () => ({ fetchData: async () => ({ isFunded: true }) }),
}));
jest.mock("helpers/hooks/useGetAppData", () => ({
  AppDataType: { RESOLVED: "resolved", REROUTE: "re-route" },
  useGetAppData: () => ({
    fetchData: async () => ({
      type: "resolved",
      account: { publicKey: mockPayer, applicationState: "APPLICATION_READY" },
      settings: {
        networkDetails: require("@shared/constants/stellar")
          .TESTNET_NETWORK_DETAILS,
      },
    }),
  }),
}));
jest.mock("@shared/api/internal", () => ({
  loadRecentAddresses: async () => ({
    recentAddresses: ["alice*example.com", "bob*example.com", "alice.nova"],
  }),
}));
jest.mock("popup/helpers/account", () => ({
  getBaseAccount: async (address: string) => address,
}));
jest.mock("popup/helpers/soroban", () => ({
  isContractId: (address: string) => address.startsWith("C"),
}));
jest.mock("popup/helpers/route", () => ({ reRouteOnboarding: jest.fn() }));
jest.mock("popup/components/SubviewHeader", () => ({
  SubviewHeader: ({ customBackAction }: { customBackAction: () => void }) => (
    <button onClick={customBackAction}>Back</button>
  ),
}));
jest.mock("popup/components/identicons/IdenticonImg", () => ({
  IdenticonImg: () => null,
}));
jest.mock("popup/helpers/localizationConfig", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const deferred = () => {
  let resolve!: (value: { account_id: string }) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<{ account_id: string }>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};
const mount = async () => {
  const next = jest.fn();
  const back = jest.fn();
  const view = render(
    <MemoryRouter>
      <SendTo goBack={back} goToNext={next} />
    </MemoryRouter>,
  );
  await act(async () => {
    await jest.advanceTimersByTimeAsync(400);
  });
  expect(screen.getByText("alice*example.com")).toBeInTheDocument();
  return { next, back, ...view };
};
const click = async (text: string) => {
  await act(async () => {
    fireEvent.click(screen.getByText(text));
  });
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it.each(["older first", "older last", "older fails"])(
  "only advances to the latest recent recipient: %s",
  async (order) => {
    const first = deferred();
    const second = deferred();
    jest
      .spyOn(Federation.Server, "resolve")
      .mockImplementation((name) =>
        name === "alice*example.com" ? first.promise : second.promise,
      );
    const { next } = await mount();
    await click("alice*example.com");
    await click("bob*example.com");
    if (order === "older first") {
      await act(async () => {
        first.resolve({ account_id: mockAlice });
      });
      expect(next).not.toHaveBeenCalled();
    }
    await act(async () => {
      second.resolve({ account_id: mockBob });
    });
    await act(async () => {
      if (order === "older fails") first.reject(new Error("late lookup error"));
      else first.resolve({ account_id: mockAlice });
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(saveDestination).toHaveBeenCalledTimes(1);
    expect(saveDestination).toHaveBeenCalledWith(mockBob);
    expect(screen.getByTestId("send-to-input")).toHaveValue("");
  },
);

it.each(["typing", "Soran recent", "my account", "back", "unmount"])(
  "cancels a pending recent lookup on %s",
  async (action) => {
    const first = deferred();
    jest.spyOn(Federation.Server, "resolve").mockReturnValue(first.promise);
    const { next, back, unmount } = await mount();
    await click("alice*example.com");
    if (action === "typing") {
      await act(async () => {
        fireEvent.change(screen.getByTestId("send-to-input"), {
          target: { value: mockBob },
        });
      });
    } else if (action === "Soran recent") await click("alice.nova");
    else if (action === "my account") {
      await act(async () => {
        fireEvent.click(screen.getByTestId("my-account-button"));
      });
    } else if (action === "back") await click("Back");
    else unmount();
    await act(async () => {
      first.resolve({ account_id: mockAlice });
    });
    expect(next).toHaveBeenCalledTimes(action === "my account" ? 1 : 0);
    expect(saveDestination).not.toHaveBeenCalledWith(mockAlice);
    if (action === "my account")
      expect(saveDestination).toHaveBeenCalledWith(mockBob);
    if (action === "back") expect(back).toHaveBeenCalledTimes(1);
    if (action === "typing")
      expect(screen.getByTestId("send-to-input")).toHaveValue(mockBob);
    if (action === "Soran recent")
      expect(screen.getByTestId("send-to-input")).toHaveValue("alice.nova");
  },
);

it("does not start a superseded debounced lookup after selecting a recent", async () => {
  const resolve = jest
    .spyOn(Federation.Server, "resolve")
    .mockResolvedValue({ account_id: mockBob });
  const { next } = await mount();
  await act(async () => {
    fireEvent.change(screen.getByTestId("send-to-input"), {
      target: { value: "alice*example.com" },
    });
  });
  await click("bob*example.com");
  await act(async () => {
    await jest.advanceTimersByTimeAsync(500);
  });
  expect(resolve).toHaveBeenCalledTimes(1);
  expect(resolve).toHaveBeenCalledWith("bob*example.com");
  expect(next).toHaveBeenCalledTimes(1);
});
