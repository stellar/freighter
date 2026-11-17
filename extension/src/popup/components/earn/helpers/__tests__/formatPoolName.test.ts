import { TFunction } from "i18next";

import en from "popup/locales/en/translation.json";
import pt from "popup/locales/pt/translation.json";

import { formatPoolName } from "../formatPoolName";

// The jest setup replaces i18next with an identity `t`, which would hide both
// the interpolation and pt's word order, so this runs a real instance over the
// shipped bundles.
const { createInstance } =
  jest.requireActual<typeof import("i18next")>("i18next");

describe("formatPoolName", () => {
  let tEn: TFunction;
  let tPt: TFunction;

  beforeAll(async () => {
    const i18n = createInstance();
    await i18n.init({
      lng: "en",
      fallbackLng: "en",
      resources: { en: { translation: en }, pt: { translation: pt } },
    });
    tEn = i18n.getFixedT("en");
    tPt = i18n.getFixedT("pt");
  });

  it("adds the word Pool before the version the pool has on chain", () => {
    expect(formatPoolName("Fixed v2.1", tEn)).toBe("Fixed Pool v2.1");
    expect(formatPoolName("Fixed v2.1", tPt)).toBe("Pool Fixed v2.1");
    expect(formatPoolName("Fixed V2", tEn)).toBe("Fixed Pool V2");
  });

  it("adds the word Pool after a name with no version", () => {
    expect(formatPoolName("Fixed", tEn)).toBe("Fixed Pool");
    expect(formatPoolName("Fixed", tPt)).toBe("Pool Fixed");
    // "v" alone, or with no number, is part of the name.
    expect(formatPoolName("Fixed v", tEn)).toBe("Fixed v Pool");
  });

  it("keeps a name that already has the word pool as is", () => {
    expect(formatPoolName("YieldBlox Pool", tEn)).toBe("YieldBlox Pool");
    expect(formatPoolName("YieldBlox Pool", tPt)).toBe("YieldBlox Pool");
    expect(formatPoolName("yieldblox POOL", tEn)).toBe("yieldblox POOL");
    expect(formatPoolName("Fixed Pool v2", tEn)).toBe("Fixed Pool v2");
  });

  it("only treats pool as a word when it is a whole word", () => {
    expect(formatPoolName("Whirlpool", tEn)).toBe("Whirlpool Pool");
  });

  it("falls back to Blend pool when the pool has no name", () => {
    expect(formatPoolName(null, tEn)).toBe("Blend pool");
    expect(formatPoolName(undefined, tEn)).toBe("Blend pool");
    expect(formatPoolName("  ", tEn)).toBe("Blend pool");
    expect(formatPoolName(null, tPt)).toBe("Pool da Blend");
  });

  it("does not HTML-escape the name", () => {
    expect(formatPoolName("A/B & Co", tEn)).toBe("A/B & Co Pool");
  });
});
