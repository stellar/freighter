import {
  fetchMetadataJson,
  MAX_METADATA_BYTES,
  METADATA_FETCH_TIMEOUT_MS,
} from "../fetchMetadataJson";

type FakeReader = {
  read: jest.Mock;
  cancel: jest.Mock;
};

const makeReader = (chunks: Uint8Array[]): FakeReader => {
  let i = 0;
  return {
    read: jest.fn().mockImplementation(() => {
      if (i >= chunks.length) {
        return Promise.resolve({ done: true, value: undefined });
      }
      const value = chunks[i];
      i += 1;
      return Promise.resolve({ done: false, value });
    }),
    cancel: jest.fn().mockResolvedValue(undefined),
  };
};

const encode = (s: string): Uint8Array => new TextEncoder().encode(s);

const makeResponse = ({
  ok = true,
  status = 200,
  statusText = "OK",
  url = "https://example.com/metadata.json",
  contentLength = null,
  reader = null,
  text = "",
  bodyCancel = jest.fn().mockResolvedValue(undefined),
}: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  url?: string;
  contentLength?: string | null;
  reader?: FakeReader | null;
  text?: string;
  bodyCancel?: jest.Mock;
} = {}): Response =>
  ({
    ok,
    status,
    statusText,
    url,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-length" ? contentLength : null,
    },
    body: reader
      ? { getReader: () => reader, cancel: bodyCancel }
      : { cancel: bodyCancel },
    text: jest.fn().mockResolvedValue(text),
  }) as unknown as Response;

describe("fetchMetadataJson", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("URL validation", () => {
    it("rejects empty strings", async () => {
      await expect(fetchMetadataJson("")).rejects.toThrow();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("rejects null values", async () => {
      await expect(
        fetchMetadataJson(null as unknown as string),
      ).rejects.toThrow();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("rejects undefined values", async () => {
      await expect(
        fetchMetadataJson(undefined as unknown as string),
      ).rejects.toThrow();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("rejects non-string values", async () => {
      await expect(
        fetchMetadataJson(123 as unknown as string),
      ).rejects.toThrow();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("rejects http:// URLs", async () => {
      await expect(
        fetchMetadataJson("http://example.com/metadata.json"),
      ).rejects.toThrow();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("rejects file:// URLs", async () => {
      await expect(fetchMetadataJson("file:///etc/passwd")).rejects.toThrow();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("rejects data: URIs", async () => {
      await expect(
        fetchMetadataJson("data:application/json,{}"),
      ).rejects.toThrow();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("rejects ftp:// URLs", async () => {
      await expect(
        fetchMetadataJson("ftp://example.com/metadata.json"),
      ).rejects.toThrow();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("rejects javascript: URLs", async () => {
      // eslint-disable-next-line no-script-url
      const scriptUrl = "javascript:alert(1)";
      await expect(fetchMetadataJson(scriptUrl)).rejects.toThrow();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("accepts https:// URLs", async () => {
      const body = '{"name":"ok"}';
      (global.fetch as jest.Mock).mockResolvedValue(
        makeResponse({ reader: makeReader([encode(body)]) }),
      );

      const result = await fetchMetadataJson<{ name: string }>(
        "https://example.com/metadata.json",
      );

      expect(result).toEqual({ name: "ok" });
      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/metadata.json",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it("accepts mixed-case HTTPS:// URLs (scheme check is case-insensitive)", async () => {
      const body = '{"name":"ok"}';
      (global.fetch as jest.Mock).mockResolvedValue(
        makeResponse({ reader: makeReader([encode(body)]) }),
      );

      const result = await fetchMetadataJson<{ name: string }>(
        "HTTPS://example.com/metadata.json",
      );

      expect(result).toEqual({ name: "ok" });
    });

    it("rejects malformed URLs", async () => {
      await expect(fetchMetadataJson("not a url")).rejects.toThrow(
        /not a valid URL/,
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("response handling", () => {
    it("throws when response.ok is false", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        makeResponse({ ok: false, status: 404, statusText: "Not Found" }),
      );

      await expect(
        fetchMetadataJson("https://example.com/missing.json"),
      ).rejects.toThrow(/404/);
    });

    it("cancels the response body on a non-OK status", async () => {
      const bodyCancel = jest.fn().mockResolvedValue(undefined);
      (global.fetch as jest.Mock).mockResolvedValue(
        makeResponse({
          ok: false,
          status: 500,
          statusText: "Server Error",
          bodyCancel,
        }),
      );

      await expect(
        fetchMetadataJson("https://example.com/err.json"),
      ).rejects.toThrow();
      expect(bodyCancel).toHaveBeenCalled();
    });

    it("rejects when the final response.url has a non-https scheme (redirect bypass)", async () => {
      const bodyCancel = jest.fn().mockResolvedValue(undefined);
      (global.fetch as jest.Mock).mockResolvedValue(
        makeResponse({
          url: "http://evil.example.com/metadata.json",
          reader: makeReader([encode('{"name":"x"}')]),
          bodyCancel,
        }),
      );

      await expect(
        fetchMetadataJson("https://example.com/metadata.json"),
      ).rejects.toThrow(/non-https/);
      expect(bodyCancel).toHaveBeenCalled();
    });

    it("accepts https→https redirects", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        makeResponse({
          url: "https://cdn.example.com/metadata.json",
          reader: makeReader([encode('{"name":"ok"}')]),
        }),
      );

      const result = await fetchMetadataJson<{ name: string }>(
        "https://example.com/metadata.json",
      );
      expect(result).toEqual({ name: "ok" });
    });

    it("parses valid JSON from streamed body", async () => {
      const body = '{"name":"Test NFT","image":"https://example.com/img.png"}';
      (global.fetch as jest.Mock).mockResolvedValue(
        makeResponse({ reader: makeReader([encode(body)]) }),
      );

      const result = await fetchMetadataJson<{
        name: string;
        image: string;
      }>("https://example.com/metadata.json");

      expect(result).toEqual({
        name: "Test NFT",
        image: "https://example.com/img.png",
      });
    });

    it("throws on invalid JSON", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        makeResponse({ reader: makeReader([encode("not json")]) }),
      );

      await expect(
        fetchMetadataJson("https://example.com/bad.json"),
      ).rejects.toThrow();
    });

    it("assembles JSON across multiple chunks", async () => {
      const chunks = [encode('{"name":"Tes'), encode('t NFT","x":1}')];
      (global.fetch as jest.Mock).mockResolvedValue(
        makeResponse({ reader: makeReader(chunks) }),
      );

      const result = await fetchMetadataJson<{ name: string; x: number }>(
        "https://example.com/metadata.json",
      );

      expect(result).toEqual({ name: "Test NFT", x: 1 });
    });
  });

  describe("size limits", () => {
    it("rejects early when Content-Length exceeds MAX_METADATA_BYTES", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        makeResponse({
          contentLength: String(MAX_METADATA_BYTES + 1),
          reader: makeReader([encode("{}")]),
        }),
      );

      await expect(
        fetchMetadataJson("https://example.com/huge.json"),
      ).rejects.toThrow(/too large/i);
    });

    it("cancels the response body when Content-Length pre-check rejects", async () => {
      const bodyCancel = jest.fn().mockResolvedValue(undefined);
      (global.fetch as jest.Mock).mockResolvedValue(
        makeResponse({
          contentLength: String(MAX_METADATA_BYTES + 1),
          reader: makeReader([encode("{}")]),
          bodyCancel,
        }),
      );

      await expect(
        fetchMetadataJson("https://example.com/huge.json"),
      ).rejects.toThrow();
      expect(bodyCancel).toHaveBeenCalled();
    });

    it("accepts when Content-Length equals MAX_METADATA_BYTES", async () => {
      const body = "{}";
      (global.fetch as jest.Mock).mockResolvedValue(
        makeResponse({
          contentLength: String(MAX_METADATA_BYTES),
          reader: makeReader([encode(body)]),
        }),
      );

      const result = await fetchMetadataJson<object>(
        "https://example.com/ok.json",
      );
      expect(result).toEqual({});
    });

    it("aborts streaming and rejects when body bytes exceed MAX_METADATA_BYTES", async () => {
      const bigChunk = new Uint8Array(MAX_METADATA_BYTES / 2);
      bigChunk.fill(0x61); // 'a'
      const chunks = [bigChunk, bigChunk, bigChunk]; // 1.5 * MAX
      const reader = makeReader(chunks);
      (global.fetch as jest.Mock).mockResolvedValue(makeResponse({ reader }));

      await expect(
        fetchMetadataJson("https://example.com/streaming-huge.json"),
      ).rejects.toThrow(/too large/i);

      expect(reader.cancel).toHaveBeenCalled();
    });

    it("falls back to response.text() when getReader is unavailable", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        makeResponse({ text: '{"name":"Fallback"}' }),
      );

      const result = await fetchMetadataJson<{ name: string }>(
        "https://example.com/metadata.json",
      );
      expect(result).toEqual({ name: "Fallback" });
    });

    it("rejects in fallback path when byte length exceeds MAX_METADATA_BYTES", async () => {
      const huge = "a".repeat(MAX_METADATA_BYTES + 10);
      (global.fetch as jest.Mock).mockResolvedValue(
        makeResponse({ text: huge }),
      );

      await expect(
        fetchMetadataJson("https://example.com/huge-fallback.json"),
      ).rejects.toThrow(/too large/i);
    });
  });

  describe("timeout", () => {
    it("aborts fetch after METADATA_FETCH_TIMEOUT_MS", async () => {
      let capturedSignal: AbortSignal | undefined;
      (global.fetch as jest.Mock).mockImplementation(
        (_url: string, init: RequestInit) => {
          capturedSignal = init.signal as AbortSignal;
          return new Promise((_, reject) => {
            const s = init.signal as AbortSignal;
            if (s) {
              s.addEventListener("abort", () => {
                reject(
                  Object.assign(new Error("aborted"), { name: "AbortError" }),
                );
              });
            }
          });
        },
      );

      const promise = fetchMetadataJson("https://example.com/slow.json");

      jest.advanceTimersByTime(METADATA_FETCH_TIMEOUT_MS);

      await expect(promise).rejects.toThrow();
      expect(capturedSignal?.aborted).toBe(true);
    });

    it("does not abort when fetch resolves before the timeout", async () => {
      const body = '{"ok":true}';
      (global.fetch as jest.Mock).mockResolvedValue(
        makeResponse({ reader: makeReader([encode(body)]) }),
      );

      const result = await fetchMetadataJson<{ ok: boolean }>(
        "https://example.com/fast.json",
      );

      expect(result).toEqual({ ok: true });
    });
  });
});
