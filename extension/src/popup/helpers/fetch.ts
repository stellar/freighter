const MAX_BODY_BYTES = 200;
// Hard cap on how much of an error response we will consume off the wire.
// Prevents a multi-MB error payload from being read into memory just to
// produce a short snippet for the thrown error.
const MAX_BODY_READ_BYTES = 4 * 1024;

const sanitizeUrl = (url: string): string => {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    const q = url.indexOf("?");
    return q >= 0 ? url.slice(0, q) : url;
  }
};

const truncate = (s: string, max: number): string =>
  s.length > max ? `${s.slice(0, max)}…[truncated]` : s;

const readBoundedText = async (
  res: Response,
): Promise<{ body?: string; readError?: unknown }> => {
  const contentLength = res.headers.get("content-length");
  if (contentLength) {
    const declared = parseInt(contentLength, 10);
    if (Number.isFinite(declared) && declared > MAX_BODY_READ_BYTES) {
      // Don't pull megabytes off the wire just to throw them away.
      return { body: `[skipped: content-length=${declared} bytes]` };
    }
  }
  try {
    const text = await res.text();
    return { body: truncate(text, MAX_BODY_BYTES) };
  } catch (readError) {
    return { readError };
  }
};

export type FetchErrorKind = "http-error" | "non-json";

export interface FetchErrorArgs {
  url: string;
  method: string;
  status: number;
  statusText: string;
  body?: string;
  kind: FetchErrorKind;
  cause?: unknown;
}

export class FetchError extends Error {
  url: string;
  method: string;
  status: number;
  statusText: string;
  body?: string;
  kind: FetchErrorKind;
  constructor(args: FetchErrorArgs) {
    const { url, method, status, statusText, body, kind, cause } = args;
    const sanitizedUrl = sanitizeUrl(url);
    const message =
      kind === "non-json"
        ? `${method} ${sanitizedUrl} returned non-JSON response (status ${status})`
        : `${method} ${sanitizedUrl} failed with status ${status}${
            statusText ? ` (${statusText})` : ""
          }`;
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = "FetchError";
    this.url = sanitizedUrl;
    this.method = method;
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    this.kind = kind;
  }
}

export const fetchJson = async <T>(url: string, options?: RequestInit) => {
  const method = (options?.method ?? "GET").toUpperCase();
  const res = await fetch(url, options);

  if (!res.ok) {
    const { body, readError } = await readBoundedText(res);
    throw new FetchError({
      url,
      method,
      status: res.status,
      statusText: res.statusText,
      body,
      kind: "http-error",
      cause: readError,
    });
  }

  if (!res.headers.get("content-type")?.includes("application/json")) {
    const { body, readError } = await readBoundedText(res);
    throw new FetchError({
      url,
      method,
      status: res.status,
      statusText: res.statusText,
      body,
      kind: "non-json",
      cause: readError,
    });
  }

  const data = (await res.json()) as T;
  return data;
};
