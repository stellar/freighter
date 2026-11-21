import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { getIconUrlFromIssuer } from "../getIconUrlFromIssuer";
import * as ExtensionMessaging from "@shared/api/helpers/extensionMessaging";
import * as ApiInternal from "@shared/api/internal";

jest.mock("stellar-sdk", () => {
  const original = jest.requireActual("stellar-sdk");
  return {
    ...original,
    StellarToml: {
      Resolver: {
        resolve: jest.fn().mockResolvedValue({
          CURRENCIES: [
            {
              code: "USDC",
              issuer:
                "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
              image: "http://tomldomain.com/baz.png",
            },
          ],
        }),
      },
    },
  };
});

describe("getIconUrlFromIssuer", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it("should return the icon url for a given issuer from the background cache", async () => {
    jest
      .spyOn(ExtensionMessaging, "sendMessageToBackground")
      .mockImplementationOnce(() =>
        Promise.resolve({
          iconUrl: "http://bgdomain.com/baz.png",
        } as any),
      );
    const iconUrl = await getIconUrlFromIssuer({
      key: "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
      code: "USDC",
      networkDetails: TESTNET_NETWORK_DETAILS,
    });
    expect(iconUrl).toBe("http://bgdomain.com/baz.png");
  });
  it("should return the icon url for a given issuer from a passed home domain", async () => {
    // mock both calls to the background
    jest
      .spyOn(ExtensionMessaging, "sendMessageToBackground")
      .mockImplementationOnce(() => Promise.resolve({} as any));
    jest
      .spyOn(ExtensionMessaging, "sendMessageToBackground")
      .mockImplementationOnce(() => Promise.resolve({} as any));
    const iconUrl = await getIconUrlFromIssuer({
      key: "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
      code: "USDC",
      networkDetails: TESTNET_NETWORK_DETAILS,
      homeDomain: "http://home.com/baz.png",
    });
    expect(iconUrl).toBe("http://tomldomain.com/baz.png");
  });
  it("should return the icon url for a given issuer from a passed home domain", async () => {
    // mock both calls to the background
    jest
      .spyOn(ExtensionMessaging, "sendMessageToBackground")
      .mockImplementationOnce(() => Promise.resolve({} as any));
    jest
      .spyOn(ExtensionMessaging, "sendMessageToBackground")
      .mockImplementationOnce(() => Promise.resolve({} as any));

    const getAssetDomainsSpy = jest
      .spyOn(ApiInternal, "getAssetDomains")
      .mockImplementationOnce(() =>
        Promise.resolve({
          GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH:
            "http://ledgerkeydomain.com/baz.png",
        }),
      );
    const iconUrl = await getIconUrlFromIssuer({
      key: "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
      code: "USDC",
      networkDetails: TESTNET_NETWORK_DETAILS,
    });

    expect(getAssetDomainsSpy).toHaveBeenCalledWith({
      assetIssuerDomainsToFetch: [
        "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
      ],
      networkDetails: TESTNET_NETWORK_DETAILS,
    });
    expect(iconUrl).toBe("http://tomldomain.com/baz.png");
  });
});

describe("getIconUrlFromIssuer cache writes", () => {
  const ISSUER = "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH";

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("does not send CACHE_ASSET_ICON when cache is false", async () => {
    const send = jest
      .spyOn(ExtensionMessaging, "sendMessageToBackground")
      .mockResolvedValue({} as any);

    const iconUrl = await getIconUrlFromIssuer({
      key: ISSUER,
      code: "USDC",
      networkDetails: TESTNET_NETWORK_DETAILS,
      homeDomain: "home.com",
      cache: false,
    });

    expect(iconUrl).toBe("http://tomldomain.com/baz.png");
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ type: "GET_CACHED_ASSET_ICON" }),
    );
  });

  it("sends CACHE_ASSET_ICON by default", async () => {
    const send = jest
      .spyOn(ExtensionMessaging, "sendMessageToBackground")
      .mockResolvedValue({} as any);

    await getIconUrlFromIssuer({
      key: ISSUER,
      code: "USDC",
      networkDetails: TESTNET_NETWORK_DETAILS,
      homeDomain: "home.com",
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CACHE_ASSET_ICON",
        iconUrl: "http://tomldomain.com/baz.png",
      }),
    );
  });

  it("still returns the url when the cache write rejects", async () => {
    jest
      .spyOn(ExtensionMessaging, "sendMessageToBackground")
      .mockResolvedValueOnce({} as any)
      .mockRejectedValueOnce(new Error("QUOTA_BYTES quota exceeded"));

    const iconUrl = await getIconUrlFromIssuer({
      key: ISSUER,
      code: "USDC",
      networkDetails: TESTNET_NETWORK_DETAILS,
      homeDomain: "home.com",
    });

    expect(iconUrl).toBe("http://tomldomain.com/baz.png");
  });
});
