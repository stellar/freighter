import { fetchBackendV2 } from "../fetchBackendV2";
import { sendMessageToBackground } from "../extensionMessaging";
import { SERVICE_TYPES } from "@shared/constants/services";

jest.mock("../extensionMessaging");
const mockedSend = sendMessageToBackground as jest.Mock;

describe("fetchBackendV2", () => {
  afterEach(() => jest.clearAllMocks());

  it("sends a FETCH_BACKEND_V2 message with the given method/path/body", async () => {
    mockedSend.mockResolvedValue({ status: 200, body: { data: 1 } });

    await fetchBackendV2({
      method: "POST",
      path: "/collectibles?network=PUBLIC",
      body: "{}",
    });

    expect(mockedSend).toHaveBeenCalledWith({
      type: SERVICE_TYPES.FETCH_BACKEND_V2,
      activePublicKey: null,
      method: "POST",
      path: "/collectibles?network=PUBLIC",
      body: "{}",
    });
  });

  it("passes through the { status, body } result, including error bodies", async () => {
    mockedSend.mockResolvedValue({ status: 500, body: { error: "boom" } });

    const res = await fetchBackendV2({ method: "GET", path: "/protocols" });

    expect(res).toEqual({ status: 500, body: { error: "boom" } });
  });

  it("normalizes an { error } reply (unauthorized sender) to a 401 result", async () => {
    // The background gate rejects unauthorized senders with { error }, not
    // { status, body }. Without normalization each caller would destructure
    // undefined and degrade differently; here it becomes a uniform non-200.
    mockedSend.mockResolvedValue({ error: "Unauthorized" });

    const res = await fetchBackendV2({ method: "GET", path: "/protocols" });

    expect(res).toEqual({ status: 401, body: { error: "Unauthorized" } });
  });

  it("maps a non-auth { error } reply to a 500 (not 401)", async () => {
    // Only sender-rejection ("Unauthorized") is an auth failure. Any other
    // error (e.g. "Message type not supported") must not be misclassified as
    // 401, or callers would treat an unrelated failure as an auth problem.
    mockedSend.mockResolvedValue({ error: "Message type not supported" });

    const res = await fetchBackendV2({ method: "GET", path: "/protocols" });

    expect(res).toEqual({
      status: 500,
      body: { error: "Message type not supported" },
    });
  });

  it("returns a 500 result for a missing/undefined response", async () => {
    // A falsy message-channel reply would break callers that destructure
    // { status, body }; normalize it to a defined non-2xx result.
    mockedSend.mockResolvedValue(undefined);

    const res = await fetchBackendV2({ method: "GET", path: "/protocols" });

    expect(res).toEqual({
      status: 500,
      body: { error: "No response from background" },
    });
  });
});
