import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { CACHED_ASSET_ICONS_ID } from "constants/localStorageTypes";

// The map shares Chrome's 10 MB storage.local quota with the key store, so
// both the entry count and the entry size are bounded. The values come from
// issuer-controlled stellar.toml files.
export const MAX_CACHED_ASSET_ICONS = 500;
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
 * Loads the icon map with every entry validated and the oldest entries
 * dropped past the cap, and writes it back when that changed anything. The
 * bound is applied on reads as well as writes because a wallet whose held
 * assets are all cached never writes.
 */
export const readAssetIconCache = async (
  localStore: DataStorageAccess,
): Promise<Record<string, string>> => {
  const stored: Record<string, unknown> =
    (await localStore.getItem(CACHED_ASSET_ICONS_ID)) || {};

  const icons: Record<string, string> = {};
  for (const [canonical, entry] of Object.entries(stored)) {
    const url = toStorableIconUrl(entry);
    if (url !== null) {
      icons[canonical] = url;
    }
  }
  // Object key order is insertion order, so the first keys are the oldest.
  const keys = Object.keys(icons);
  for (let i = 0; i < keys.length - MAX_CACHED_ASSET_ICONS; i += 1) {
    delete icons[keys[i]];
  }

  const changed =
    Object.keys(stored).length !== Object.keys(icons).length ||
    Object.entries(icons).some(([canonical, url]) => stored[canonical] !== url);
  if (changed) {
    try {
      await localStore.setItem(CACHED_ASSET_ICONS_ID, icons);
    } catch (e) {
      // The caller asked to read; a failed shrink must not cost it the icons.
      console.error(e);
    }
  }
  return icons;
};
