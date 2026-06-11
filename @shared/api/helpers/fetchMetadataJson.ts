/**
 * Maximum size (in bytes) of a metadata response body we read. Real NFT
 * metadata JSON is typically well under 10 KB; 1 MB provides generous
 * headroom while keeping memory usage bounded.
 */
export const MAX_METADATA_BYTES = 1024 * 1024;

/**
 * Hard timeout for a metadata fetch. If the request does not complete within
 * this window the in-flight fetch is aborted via AbortController so slow or
 * unreachable hosts do not leave work hanging.
 */
export const METADATA_FETCH_TIMEOUT_MS = 5000;

/**
 * Fetches and parses a JSON metadata document from a remote URL with
 * sensible defaults for bounded, resilient reads.
 *
 * Behavior:
 * 1. URL scheme is restricted to `https:` (parsed via `new URL`, so the
 *    check is case-insensitive and rejects malformed URLs). Other schemes
 *    (including `http`) are rejected before any network call.
 * 2. After the fetch resolves the final `response.url` is re-checked so a
 *    server that 3xx-redirects to a non-https scheme cannot bypass step 1.
 *    If `response.url` is present but cannot be parsed we fail closed — we
 *    can't confirm the scheme, so we can't confirm we weren't redirected.
 * 3. A 5-second AbortController-backed timeout bounds how long we wait.
 * 4. `Content-Length` is pre-checked — if the server advertises a body larger
 *    than MAX_METADATA_BYTES the request fails fast.
 * 5. The body is read via `response.body.getReader()` with a byte counter;
 *    if accumulated bytes exceed MAX_METADATA_BYTES the reader is cancelled
 *    and the call fails. This keeps memory bounded even when
 *    `Content-Length` is absent or inaccurate.
 * 6. If `response.body.getReader` is unavailable in the current runtime, the
 *    helper falls back to `response.text()` followed by a byte-length check.
 *    In that fallback the body is fully buffered before the size check runs,
 *    so the only up-front bounds are the Content-Length pre-check (when the
 *    server advertises it) and the AbortController timeout; the post-download
 *    check is a secondary gate. All modern browser runtimes expose
 *    `getReader`, so the fallback path is rare in practice.
 *
 * On any early-exit failure (redirect to non-https, non-OK status, oversized
 * Content-Length) the response body is cancelled before throwing so streaming
 * implementations don't continue downloading into a discarded response.
 */
export const fetchMetadataJson = async <T>(url: string): Promise<T> => {
  if (!url || typeof url !== "string") {
    throw new Error("fetchMetadataJson: url must be a non-empty string");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("fetchMetadataJson: url is not a valid URL");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error(
      `fetchMetadataJson: url scheme must be https (got ${parsedUrl.protocol})`,
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    METADATA_FETCH_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, { signal: controller.signal });

    // Validate the *final* URL (after any redirects) is still https. The
    // input-URL check alone can be bypassed by a server that 3xx-redirects
    // to a non-https scheme, which fetch follows by default. Fail closed if
    // we can't parse response.url — we can't confirm the scheme, so we
    // can't confirm we weren't redirected away.
    if (response.url) {
      let finalProtocol: string | null = null;
      try {
        finalProtocol = new URL(response.url).protocol;
      } catch {
        finalProtocol = null;
      }
      if (finalProtocol !== "https:") {
        await response.body?.cancel?.().catch(() => {});
        throw new Error(
          finalProtocol === null
            ? "fetchMetadataJson: could not parse final response.url"
            : "fetchMetadataJson: redirect landed on a non-https scheme",
        );
      }
    }

    if (!response.ok) {
      await response.body?.cancel?.().catch(() => {});
      throw new Error(
        `fetchMetadataJson: request failed with ${response.status} ${response.statusText}`,
      );
    }

    const contentLengthHeader = response.headers.get("content-length");
    if (contentLengthHeader !== null) {
      const contentLength = parseInt(contentLengthHeader, 10);
      if (
        Number.isFinite(contentLength) &&
        contentLength > MAX_METADATA_BYTES
      ) {
        await response.body?.cancel?.().catch(() => {});
        throw new Error(
          `fetchMetadataJson: response too large (${contentLength} bytes, max ${MAX_METADATA_BYTES})`,
        );
      }
    }

    const reader = response.body?.getReader?.() as
      | ReadableStreamDefaultReader<Uint8Array>
      | undefined;
    let text: string;

    if (reader) {
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      let done = false;
      while (!done) {
        const chunk = await reader.read();
        done = chunk.done;
        if (chunk.value) {
          totalBytes += chunk.value.byteLength;
          if (totalBytes > MAX_METADATA_BYTES) {
            await reader.cancel().catch(() => {});
            throw new Error(
              `fetchMetadataJson: response too large (>${MAX_METADATA_BYTES} bytes)`,
            );
          }
          chunks.push(chunk.value);
        }
      }

      const merged = new Uint8Array(totalBytes);
      let offset = 0;
      chunks.forEach((chunk) => {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      });
      text = new TextDecoder("utf-8").decode(merged);
    } else {
      text = await response.text();
      const byteLength = new TextEncoder().encode(text).byteLength;
      if (byteLength > MAX_METADATA_BYTES) {
        throw new Error(
          `fetchMetadataJson: response too large (${byteLength} bytes, max ${MAX_METADATA_BYTES})`,
        );
      }
    }

    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timeoutId);
  }
};
