import {
  parseBannerPayload,
  parseScreenPayload,
} from "../parseMaintenanceContent";

// Mock the i18next localization config so we can control the detected language
const mockI18n = { language: "en" };
jest.mock("popup/helpers/localizationConfig", () => ({
  __esModule: true,
  get default() {
    return mockI18n;
  },
}));

describe("parseBannerPayload", () => {
  const validPayload = {
    theme: "warning",
    url: "https://status.stellar.org",
    banner: { title: { en: "Services degraded", pt: "Serviços degradados" } },
    modal: {
      title: { en: "Details", pt: "Detalhes" },
      body: { en: ["Line one", "Line two"], pt: ["Linha um", "Linha dois"] },
    },
  };

  beforeEach(() => {
    mockI18n.language = "en";
  });

  it("returns null for null payload", () => {
    expect(parseBannerPayload(null)).toBeNull();
  });

  it("returns null for undefined payload", () => {
    expect(parseBannerPayload(undefined)).toBeNull();
  });

  it("returns null for non-object payload", () => {
    expect(parseBannerPayload("string")).toBeNull();
    expect(parseBannerPayload(42)).toBeNull();
  });

  it("returns null when banner field is missing", () => {
    expect(parseBannerPayload({ theme: "warning" })).toBeNull();
  });

  it("returns null when banner.title produces empty string", () => {
    // Payload has title map but neither key matches and no 'en' fallback
    expect(
      parseBannerPayload({
        theme: "warning",
        banner: { title: { fr: "Titre" } },
      }),
    ).toBeNull();
  });

  it("resolves English title for English locale", () => {
    const result = parseBannerPayload(validPayload);
    expect(result).not.toBeNull();
    expect(result?.bannerTitle).toBe("Services degraded");
  });

  it("resolves Portuguese title for Portuguese locale", () => {
    mockI18n.language = "pt";
    const result = parseBannerPayload(validPayload);
    expect(result?.bannerTitle).toBe("Serviços degradados");
  });

  it("falls back to English when browser locale not in map", () => {
    mockI18n.language = "de";
    const result = parseBannerPayload(validPayload);
    expect(result?.bannerTitle).toBe("Services degraded");
  });

  it("handles locale like 'en-US' by extracting base code", () => {
    mockI18n.language = "en-US";
    const result = parseBannerPayload(validPayload);
    expect(result?.bannerTitle).toBe("Services degraded");
  });

  it("sets correct theme", () => {
    expect(parseBannerPayload(validPayload)?.theme).toBe("warning");
  });

  it("defaults theme to 'warning' for invalid theme", () => {
    const result = parseBannerPayload({ ...validPayload, theme: "invalid" });
    expect(result?.theme).toBe("warning");
  });

  it("accepts all valid themes", () => {
    const themes = ["primary", "secondary", "tertiary", "warning", "error"];
    themes.forEach((theme) => {
      const result = parseBannerPayload({ ...validPayload, theme });
      expect(result?.theme).toBe(theme);
    });
  });

  it("includes url when valid https url is present", () => {
    expect(parseBannerPayload(validPayload)?.url).toBe(
      "https://status.stellar.org",
    );
  });

  it("omits url when protocol is not https", () => {
    const result = parseBannerPayload({
      ...validPayload,
      url: "http://status.stellar.org",
    });
    expect(result?.url).toBeUndefined();
  });

  it("omits url when not a string", () => {
    const result = parseBannerPayload({ ...validPayload, url: 123 });
    expect(result?.url).toBeUndefined();
  });

  it("includes modal content when present", () => {
    const result = parseBannerPayload(validPayload);
    expect(result?.modal?.title).toBe("Details");
    expect(result?.modal?.body).toEqual(["Line one", "Line two"]);
  });

  it("omits modal when not present in payload", () => {
    const { modal: _, ...noModal } = validPayload;
    expect(parseBannerPayload(noModal)?.modal).toBeUndefined();
  });

  it("omits modal when modal.title is missing", () => {
    const result = parseBannerPayload({
      ...validPayload,
      modal: { body: { en: ["text"] } },
    });
    expect(result?.modal).toBeUndefined();
  });

  it("resolves Portuguese modal content for Portuguese locale", () => {
    mockI18n.language = "pt";
    const result = parseBannerPayload(validPayload);
    expect(result?.modal?.title).toBe("Detalhes");
    expect(result?.modal?.body).toEqual(["Linha um", "Linha dois"]);
  });

  it("filters out non-string and empty values from modal body", () => {
    const result = parseBannerPayload({
      ...validPayload,
      modal: {
        title: { en: "Details" },
        body: { en: ["valid", 42, null, "", "  ", "also valid"] as any },
      },
    });
    expect(result?.modal?.body).toEqual(["valid", "also valid"]);
  });
});

describe("parseScreenPayload", () => {
  const validPayload = {
    content: {
      title: { en: "Maintenance in progress", pt: "Manutenção em andamento" },
      body: {
        en: ["We'll be back soon.", "Thank you for your patience."],
        pt: ["Voltaremos em breve.", "Obrigado pela sua paciência."],
      },
    },
  };

  beforeEach(() => {
    mockI18n.language = "en";
  });

  it("returns null for null payload", () => {
    expect(parseScreenPayload(null)).toBeNull();
  });

  it("returns null for non-object payload", () => {
    expect(parseScreenPayload("text")).toBeNull();
  });

  it("returns null when content field is missing", () => {
    expect(parseScreenPayload({})).toBeNull();
  });

  it("returns null when content.title is missing", () => {
    expect(
      parseScreenPayload({ content: { body: { en: ["text"] } } }),
    ).toBeNull();
  });

  it("returns null when title produces empty string", () => {
    expect(
      parseScreenPayload({
        content: { title: { fr: "Titre" }, body: { en: [] } },
      }),
    ).toBeNull();
  });

  it("resolves English title and body for English locale", () => {
    const result = parseScreenPayload(validPayload);
    expect(result).not.toBeNull();
    expect(result?.title).toBe("Maintenance in progress");
    expect(result?.body).toEqual([
      "We'll be back soon.",
      "Thank you for your patience.",
    ]);
  });

  it("resolves Portuguese content for Portuguese locale", () => {
    mockI18n.language = "pt";
    const result = parseScreenPayload(validPayload);
    expect(result?.title).toBe("Manutenção em andamento");
    expect(result?.body).toEqual([
      "Voltaremos em breve.",
      "Obrigado pela sua paciência.",
    ]);
  });

  it("falls back to English when locale not in map", () => {
    mockI18n.language = "ja";
    const result = parseScreenPayload(validPayload);
    expect(result?.title).toBe("Maintenance in progress");
  });

  it("handles empty body array", () => {
    const result = parseScreenPayload({
      content: { title: { en: "Title" }, body: { en: [] } },
    });
    expect(result?.body).toEqual([]);
  });

  it("filters out non-string and empty values from body array", () => {
    const result = parseScreenPayload({
      content: {
        title: { en: "Title" },
        body: { en: ["valid", 42, null, "", "  ", "also valid"] as any },
      },
    });
    expect(result?.body).toEqual(["valid", "also valid"]);
  });
});
