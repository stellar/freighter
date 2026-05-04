import { fetchJson, FetchError } from "../fetch";

describe("fetchJson", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const mockFetch = (response: Partial<Response>) => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(response) as unknown as typeof fetch;
  };

  it("returns parsed JSON on a 2xx response", async () => {
    mockFetch({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ data: { ok: true }, error: null }),
    } as Response);

    const result = await fetchJson<{ data: { ok: boolean } }>("/x");
    expect(result.data.ok).toBe(true);
  });

  it("throws FetchError with status when response is not ok (e.g. 429)", async () => {
    mockFetch({
      ok: false,
      status: 429,
      // statusText is empty over HTTP/2, which is what reaches Sentry in prod
      statusText: "",
      text: async () => "rate limited",
    } as Response);

    await expect(fetchJson("/x")).rejects.toMatchObject({
      name: "FetchError",
      status: 429,
      message: expect.stringContaining("429"),
    });
  });

  it("includes statusText and body when present", async () => {
    mockFetch({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => '{"error":"invalid xdr"}',
    } as Response);

    let caught: FetchError | undefined;
    try {
      await fetchJson("/x");
    } catch (e) {
      caught = e as FetchError;
    }
    expect(caught).toBeInstanceOf(FetchError);
    expect(caught!.message).toContain("400");
    expect(caught!.message).toContain("Bad Request");
    expect(caught!.message).toContain("invalid xdr");
    expect(caught!.body).toBe('{"error":"invalid xdr"}');
  });

  it("does not throw a message-less Error when statusText is empty (regression for FREIGHTER-DMQ)", async () => {
    mockFetch({
      ok: false,
      status: 431,
      statusText: "",
      text: async () => "",
    } as Response);

    await expect(fetchJson("/x")).rejects.toThrow(/431/);
  });
});
