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

    const result = await fetchJson<{ data: { ok: boolean } }>(
      "https://api.example.com/x",
    );
    expect(result.data.ok).toBe(true);
  });

  it("throws FetchError with status when response is not ok (e.g. 429)", async () => {
    mockFetch({
      ok: false,
      status: 429,
      // statusText is empty over HTTP/2, which is what reaches Sentry in prod
      statusText: "",
      headers: new Headers(),
      text: async () => "rate limited",
    } as Response);

    await expect(fetchJson("https://api.example.com/x")).rejects.toMatchObject({
      name: "FetchError",
      status: 429,
      kind: "http-error",
      message: expect.stringContaining("429"),
    });
  });

  it("includes statusText, sanitized URL, and method in the message", async () => {
    mockFetch({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      headers: new Headers(),
      text: async () => '{"error":"invalid xdr"}',
    } as Response);

    let caught: FetchError | undefined;
    try {
      await fetchJson("https://api.example.com/scan-tx?token=secret", {
        method: "post",
      });
    } catch (e) {
      caught = e as FetchError;
    }
    expect(caught).toBeInstanceOf(FetchError);
    expect(caught!.message).toContain("400");
    expect(caught!.message).toContain("Bad Request");
    expect(caught!.message).toContain("POST");
    expect(caught!.message).toContain("https://api.example.com/scan-tx");
    // Query string is stripped from the message and the url property
    expect(caught!.message).not.toContain("token=secret");
    expect(caught!.url).toBe("https://api.example.com/scan-tx");
    expect(caught!.method).toBe("POST");
    expect(caught!.body).toBe('{"error":"invalid xdr"}');
  });

  it("does not throw a message-less Error when statusText is empty (regression for FREIGHTER-DMQ)", async () => {
    mockFetch({
      ok: false,
      status: 431,
      statusText: "",
      headers: new Headers(),
      text: async () => "",
    } as Response);

    await expect(fetchJson("https://api.example.com/x")).rejects.toThrow(/431/);
  });

  it("throws FetchError on non-JSON 2xx (kind: non-json) without interpolating body into the message", async () => {
    const html = "<html><body>captcha</body></html>";
    mockFetch({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "text/html" }),
      text: async () => html,
    } as Response);

    let caught: FetchError | undefined;
    try {
      await fetchJson("https://api.example.com/x");
    } catch (e) {
      caught = e as FetchError;
    }
    expect(caught).toBeInstanceOf(FetchError);
    expect(caught!.kind).toBe("non-json");
    expect(caught!.status).toBe(200);
    expect(caught!.body).toBe(html);
    // Body must NOT be in the stable Sentry-grouped message — it goes on the property only.
    expect(caught!.message).not.toContain("captcha");
    expect(caught!.message).toContain("non-JSON");
  });

  it("appends a truncation marker when the body exceeds the cap", async () => {
    const huge = "x".repeat(500);
    mockFetch({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      headers: new Headers(),
      text: async () => huge,
    } as Response);

    let caught: FetchError | undefined;
    try {
      await fetchJson("https://api.example.com/x");
    } catch (e) {
      caught = e as FetchError;
    }
    expect(caught!.body).toMatch(/\[truncated\]$/);
    expect(caught!.body!.length).toBeLessThan(huge.length);
  });

  it("skips reading huge bodies based on Content-Length", async () => {
    mockFetch({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      headers: new Headers({ "content-length": String(10 * 1024 * 1024) }),
      text: async () => "should not be called",
    } as Response);

    let caught: FetchError | undefined;
    try {
      await fetchJson("https://api.example.com/x");
    } catch (e) {
      caught = e as FetchError;
    }
    expect(caught!.body).toMatch(/^\[skipped: content-length=/);
  });

  it("preserves status-only message when res.text() rejects, and chains the cause", async () => {
    const readError = new Error("body unreadable");
    mockFetch({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      headers: new Headers(),
      text: async () => Promise.reject(readError),
    } as Response);

    let caught: FetchError | undefined;
    try {
      await fetchJson("https://api.example.com/x");
    } catch (e) {
      caught = e as FetchError;
    }
    expect(caught).toBeInstanceOf(FetchError);
    expect(caught!.message).toContain("502");
    expect(caught!.message).toContain("Bad Gateway");
    expect(caught!.body).toBeUndefined();
    expect((caught as Error & { cause?: unknown }).cause).toBe(readError);
  });
});
