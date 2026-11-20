import { formatDepositDate } from "popup/components/earn/helpers/formatDepositDate";

// Built from local time, so the expected clock reading holds in any timezone.
const CREATED_AT = new Date(2026, 7, 28, 14, 33).toISOString();

describe("formatDepositDate", () => {
  it("formats in English as the design writes it", () => {
    expect(formatDepositDate(CREATED_AT, "en")).toBe("Aug 28, 2026 · 2:33pm");
  });

  it("formats in the app's language", () => {
    expect(formatDepositDate(CREATED_AT, "pt")).toBe(
      "28 de ago. de 2026 · 14:33",
    );
  });
});
