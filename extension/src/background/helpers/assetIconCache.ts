// The map shares Chrome's 10 MB storage.local quota with the key store, so
// the entry count, the key size and the value size are all bounded. Values
// come from issuer tomls and token lists; a Soroban key carries the token's
// own symbol, which its contract sets.
export const MAX_CACHED_ASSET_ICONS = 500;
export const MAX_ASSET_CANONICAL_LENGTH = 256;
const MAX_ICON_URL_LENGTH = 2048;

/**
 * Returns the canonical https href to store, or null when the value is not
 * a storable icon url. The parsed href is ASCII with `<`, `>` and `"`
 * percent-encoded, so its JSON form (what storage.local meters) is the same
 * length as the string.
 */
export const toStorableIconUrl = (iconUrl: unknown): string | null => {
  if (typeof iconUrl !== "string" || iconUrl.length > MAX_ICON_URL_LENGTH) {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(iconUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") {
    return null;
  }
  return parsed.href.length > MAX_ICON_URL_LENGTH ? null : parsed.href;
};

/**
 * The map with every key and value validated and the oldest entries dropped past the
 * cap. Object key order is insertion order, so the first keys are the oldest.
 */
export const boundAssetIconMap = (
  stored: Record<string, unknown>,
): Record<string, string> => {
  const icons: Record<string, string> = {};
  for (const [canonical, entry] of Object.entries(stored)) {
    const url = toStorableIconUrl(entry);
    if (url !== null && canonical.length <= MAX_ASSET_CANONICAL_LENGTH) {
      icons[canonical] = url;
    }
  }
  const keys = Object.keys(icons);
  for (let i = 0; i < keys.length - MAX_CACHED_ASSET_ICONS; i += 1) {
    delete icons[keys[i]];
  }
  return icons;
};
