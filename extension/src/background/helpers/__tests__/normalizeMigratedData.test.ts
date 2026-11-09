import { KEY_ID, KEY_ID_LIST } from "constants/localStorageTypes";

// `normalizeMigratedData` reads `browserLocalStorage` directly, so hand it an
// in-memory one.
const mockStorage: Record<string, unknown> = {};
jest.mock("../dataStorageAccess", () => {
  const actual = jest.requireActual("../dataStorageAccess");
  const area = {
    get: async (key: string | null) =>
      key === null ? { ...mockStorage } : { [key]: mockStorage[key] },
    set: async (items: Record<string, unknown>) => {
      Object.assign(mockStorage, items);
    },
    remove: async () => {},
    clear: async () => {},
  };
  return {
    ...actual,
    browserLocalStorage: area,
    dataStorageAccess: () => actual.dataStorageAccess(area),
  };
});

// eslint-disable-next-line import/first
import { normalizeMigratedData } from "../dataStorage";

describe("normalizeMigratedData", () => {
  beforeEach(() => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
  });

  // The root cause of the numeric `keyId` the old load-time repair undid:
  // a key-manager id such as "0.8123" parses as a number.
  it("keeps key-manager ids as strings", async () => {
    mockStorage[KEY_ID] = "0.8251530838260752";
    mockStorage[KEY_ID_LIST] = '["0.8251530838260752"]';

    await normalizeMigratedData();

    expect(mockStorage[KEY_ID]).toBe("0.8251530838260752");
    // A legacy JSON-string list is still parsed, and its ids stay strings.
    expect(mockStorage[KEY_ID_LIST]).toEqual(["0.8251530838260752"]);
  });

  it("still parses other legacy JSON strings", async () => {
    mockStorage.isValidatingMemo = "true";

    await normalizeMigratedData();

    expect(mockStorage.isValidatingMemo).toBe(true);
  });
});
