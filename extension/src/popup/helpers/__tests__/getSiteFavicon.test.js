import { getSiteFavicon, FAVICON_URL } from "../getSiteFavicon";

describe("getSiteFavicon", () => {
  const url = "domain.xx";
  it("should return favicon url", () => {
    expect(getSiteFavicon(url)).toBe(`${FAVICON_URL}${url}`);
  });
});
