export class FetchError extends Error {
  status: number;
  statusText: string;
  body?: string;
  constructor(status: number, statusText: string, body?: string) {
    const detail = body ? `: ${body.slice(0, 200)}` : "";
    super(
      `Request failed with status ${status}${statusText ? ` (${statusText})` : ""}${detail}`,
    );
    this.name = "FetchError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

export const fetchJson = async <T>(url: string, options?: RequestInit) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    let body: string | undefined;
    try {
      body = await res.text();
    } catch {
      // body unreadable — keep status-only message
    }
    throw new FetchError(res.status, res.statusText, body);
  }

  if (!res.headers.get("content-type")?.includes("application/json")) {
    const content = await res.text();
    throw new Error(`Did not receive json error:${content}`);
  }

  const data = (await res.json()) as T;
  return data;
};
