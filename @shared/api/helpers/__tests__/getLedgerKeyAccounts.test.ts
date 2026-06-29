import { getLedgerKeyAccounts } from "../getLedgerKeyAccounts";
import { sendMessageToBackground } from "../extensionMessaging";
import { SERVICE_TYPES } from "@shared/constants/services";

jest.mock("../extensionMessaging");
const mockedSend = sendMessageToBackground as jest.Mock;

it("posts public_keys to /ledger-key/accounts via FETCH_BACKEND_V2 (with network query)", async () => {
  mockedSend.mockResolvedValue({
    status: 200,
    body: { data: { ledger_key_accounts: { G1: { home_domain: "ex.com" } } } },
  });

  const result = await getLedgerKeyAccounts({
    accountList: ["G1"],
    networkDetails: { network: "PUBLIC" } as never,
  });

  expect(mockedSend).toHaveBeenCalledWith({
    type: SERVICE_TYPES.FETCH_BACKEND_V2,
    activePublicKey: null,
    method: "POST",
    path: "/ledger-key/accounts?network=PUBLIC",
    body: JSON.stringify({ public_keys: ["G1"] }),
  });
  expect(result).toEqual({ G1: { home_domain: "ex.com" } });
});
