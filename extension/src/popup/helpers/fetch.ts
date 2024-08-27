export const fetchJson = async <T>(url: string, options?: RequestInit) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(res.statusText);
  }

  if (res.headers.get("content-type") !== "application/json") {
    const content = await res.text();
    throw new Error(content);
  }

  const data = res.json() as T;
  return data;
};
