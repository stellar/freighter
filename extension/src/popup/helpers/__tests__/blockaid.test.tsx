import React from "react";
import { Provider } from "react-redux";
import { renderHook } from "@testing-library/react";
import {
  isAssetUnableToScan,
  isTxUnableToScan,
  shouldTreatTxAsUnableToScan,
  shouldTreatAssetAsUnableToScan,
  isTxSuspicious,
  useIsTxSuspicious,
  useShouldTreatTxAsUnableToScan,
  isBlockaidEnabled,
  getSiteSecurityStates,
} from "../blockaid";
import { SecurityLevel } from "popup/constants/blockaid";
import {
  BlockAidScanAssetResult,
  BlockAidScanSiteResult,
  BlockAidScanTxResult,
} from "@shared/api/types";
import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
  FUTURENET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { makeDummyStore } from "popup/__testHelpers__";

// Mock process.env to control dev mode
const originalEnv = process.env;

describe("BlockAid Helper Functions", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    jest.resetModules();
    process.env = originalEnv;
  });

  describe("isAssetUnableToScan", () => {
    it("should return true when blockaidData is null", () => {
      expect(isAssetUnableToScan(null)).toBe(true);
    });

    it("should return true when blockaidData is undefined", () => {
      expect(isAssetUnableToScan(undefined)).toBe(true);
    });

    it("should return true when blockaidData has no result_type", () => {
      expect(isAssetUnableToScan({} as BlockAidScanAssetResult)).toBe(true);
    });

    it("should return false when blockaidData has result_type", () => {
      const blockaidData: BlockAidScanAssetResult = {
        result_type: "Benign",
      } as BlockAidScanAssetResult;
      expect(isAssetUnableToScan(blockaidData)).toBe(false);
    });
  });

  describe("isTxUnableToScan", () => {
    it("should return true when blockaidData is null", () => {
      expect(isTxUnableToScan(null)).toBe(true);
    });

    it("should return true when blockaidData is undefined", () => {
      expect(isTxUnableToScan(undefined)).toBe(true);
    });

    it("should return false when blockaidData exists", () => {
      const blockaidData: BlockAidScanTxResult = {
        simulation: {},
        validation: {},
      } as BlockAidScanTxResult;
      expect(isTxUnableToScan(blockaidData)).toBe(false);
    });
  });

  describe("shouldTreatTxAsUnableToScan", () => {
    beforeEach(() => {
      process.env.DEV_EXTENSION = "true";
    });

    it("should return true when debug override is UNABLE_TO_SCAN (dev mode)", () => {
      expect(
        shouldTreatTxAsUnableToScan(
          { simulation: {} } as BlockAidScanTxResult,
          SecurityLevel.UNABLE_TO_SCAN,
          MAINNET_NETWORK_DETAILS,
        ),
      ).toBe(true);
    });

    it("should return false when debug override is not UNABLE_TO_SCAN (dev mode)", () => {
      expect(
        shouldTreatTxAsUnableToScan(
          { simulation: {} } as BlockAidScanTxResult,
          SecurityLevel.SAFE,
          MAINNET_NETWORK_DETAILS,
        ),
      ).toBe(false);
    });

    it("should return true when blockaidData is unable to scan (no override)", () => {
      expect(
        shouldTreatTxAsUnableToScan(null, null, MAINNET_NETWORK_DETAILS),
      ).toBe(true);
    });

    it("should return false when blockaidData is valid (no override)", () => {
      expect(
        shouldTreatTxAsUnableToScan(
          { simulation: {} } as BlockAidScanTxResult,
          null,
          MAINNET_NETWORK_DETAILS,
        ),
      ).toBe(false);
    });

    it("should return false on non-mainnet networks even when scan data is missing", () => {
      // Network gate trips before the missing-scan-data branch, so the UI
      // does not show an "unable to scan" warning off mainnet.
      expect(
        shouldTreatTxAsUnableToScan(null, null, TESTNET_NETWORK_DETAILS),
      ).toBe(false);
      expect(
        shouldTreatTxAsUnableToScan(null, null, FUTURENET_NETWORK_DETAILS),
      ).toBe(false);
    });

    it("should respect dev override above the network gate", () => {
      // Even on testnet, an explicit dev UNABLE_TO_SCAN override still
      // forces the unable-to-scan UI so devs can exercise the path.
      expect(
        shouldTreatTxAsUnableToScan(
          null,
          SecurityLevel.UNABLE_TO_SCAN,
          TESTNET_NETWORK_DETAILS,
        ),
      ).toBe(true);
    });

    it("should ignore debug override in production mode", () => {
      process.env.DEV_EXTENSION = "false";
      process.env.PRODUCTION = "true";
      jest.resetModules();
      jest.doMock("@shared/helpers/dev", () => ({
        isDev: false,
      }));
      const { shouldTreatTxAsUnableToScan: testFn } = require("../blockaid");
      expect(
        testFn(
          { simulation: {} } as BlockAidScanTxResult,
          SecurityLevel.UNABLE_TO_SCAN,
          MAINNET_NETWORK_DETAILS,
        ),
      ).toBe(false);
    });
  });

  describe("isTxSuspicious", () => {
    beforeEach(() => {
      process.env.DEV_EXTENSION = "true";
    });

    describe("with debug override (dev mode)", () => {
      it("should return false when override is UNABLE_TO_SCAN", () => {
        expect(
          isTxSuspicious(
            {
              validation: { result_type: "Malicious" },
            } as BlockAidScanTxResult,
            SecurityLevel.UNABLE_TO_SCAN,
          ),
        ).toBe(false);
      });

      it("should return false when override is SAFE", () => {
        expect(
          isTxSuspicious(
            {
              validation: { result_type: "Malicious" },
            } as BlockAidScanTxResult,
            SecurityLevel.SAFE,
          ),
        ).toBe(false);
      });

      it("should return true when override is SUSPICIOUS", () => {
        expect(
          isTxSuspicious(
            {
              validation: { result_type: "Benign" },
            } as BlockAidScanTxResult,
            SecurityLevel.SUSPICIOUS,
          ),
        ).toBe(true);
      });

      it("should return true when override is MALICIOUS", () => {
        expect(
          isTxSuspicious(
            {
              validation: { result_type: "Benign" },
            } as BlockAidScanTxResult,
            SecurityLevel.MALICIOUS,
          ),
        ).toBe(true);
      });
    });

    describe("without debug override", () => {
      it("should return false when unable to scan", () => {
        expect(isTxSuspicious(null, null)).toBe(false);
      });

      it("should return false when blockaidData is null", () => {
        expect(isTxSuspicious(null, null)).toBe(false);
      });

      it("should return true when simulation has error", () => {
        expect(
          isTxSuspicious(
            {
              simulation: { error: "test error" },
            } as BlockAidScanTxResult,
            null,
          ),
        ).toBe(true);
      });

      it("should return true when validation result_type is not Benign", () => {
        expect(
          isTxSuspicious(
            {
              validation: { result_type: "Malicious" },
            } as BlockAidScanTxResult,
            null,
          ),
        ).toBe(true);
      });

      it("should return true when validation result_type is Warning", () => {
        expect(
          isTxSuspicious(
            {
              validation: { result_type: "Warning" },
            } as BlockAidScanTxResult,
            null,
          ),
        ).toBe(true);
      });

      it("should return false when validation result_type is Benign", () => {
        expect(
          isTxSuspicious(
            {
              validation: { result_type: "Benign" },
            } as BlockAidScanTxResult,
            null,
          ),
        ).toBe(false);
      });
    });

    it("should ignore debug override in production mode", () => {
      process.env.DEV_EXTENSION = "false";
      process.env.PRODUCTION = "true";
      jest.resetModules();
      jest.doMock("@shared/helpers/dev", () => ({
        isDev: false,
      }));
      const { isTxSuspicious: testFn } = require("../blockaid");
      expect(
        testFn(
          {
            validation: { result_type: "Benign" },
          } as BlockAidScanTxResult,
          SecurityLevel.MALICIOUS,
        ),
      ).toBe(false);
    });
  });

  describe("useIsTxSuspicious hook", () => {
    beforeEach(() => {
      process.env.DEV_EXTENSION = "true";
    });

    it("should use debug override from Redux store (dev mode)", () => {
      const store = makeDummyStore({
        settings: {
          overriddenBlockaidResponse: SecurityLevel.SUSPICIOUS,
          networkDetails: MAINNET_NETWORK_DETAILS,
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

      const { result } = renderHook(() => useIsTxSuspicious(), {
        wrapper: Wrapper,
      });

      expect(
        result.current({
          validation: { result_type: "Benign" },
        } as BlockAidScanTxResult),
      ).toBe(true);
    });

    it("should ignore debug override in production mode", () => {
      process.env.DEV_EXTENSION = "false";
      process.env.PRODUCTION = "true";
      jest.resetModules();
      jest.doMock("@shared/helpers/dev", () => ({
        isDev: false,
      }));
      const { isTxSuspicious: testFn } = require("../blockaid");
      expect(
        testFn(
          {
            validation: { result_type: "Benign" },
          } as BlockAidScanTxResult,
          SecurityLevel.MALICIOUS,
        ),
      ).toBe(false);
    });
  });

  describe("useShouldTreatTxAsUnableToScan hook", () => {
    beforeEach(() => {
      process.env.DEV_EXTENSION = "true";
    });

    it("should use debug override from Redux store (dev mode)", () => {
      const store = makeDummyStore({
        settings: {
          overriddenBlockaidResponse: SecurityLevel.UNABLE_TO_SCAN,
          networkDetails: MAINNET_NETWORK_DETAILS,
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

      const { result } = renderHook(() => useShouldTreatTxAsUnableToScan(), {
        wrapper: Wrapper,
      });

      expect(result.current({ simulation: {} } as BlockAidScanTxResult)).toBe(
        true,
      );
    });

    it("should ignore debug override in production mode", () => {
      process.env.DEV_EXTENSION = "false";
      process.env.PRODUCTION = "true";
      jest.resetModules();
      jest.doMock("@shared/helpers/dev", () => ({
        isDev: false,
      }));
      const { shouldTreatTxAsUnableToScan: testFn } = require("../blockaid");
      expect(
        testFn(
          { simulation: {} } as BlockAidScanTxResult,
          SecurityLevel.UNABLE_TO_SCAN,
          MAINNET_NETWORK_DETAILS,
        ),
      ).toBe(false);
    });
  });

  describe("isBlockaidEnabled", () => {
    afterEach(() => {
      delete (window as unknown as { IS_PLAYWRIGHT?: string }).IS_PLAYWRIGHT;
    });

    it("returns true on mainnet", () => {
      expect(isBlockaidEnabled(MAINNET_NETWORK_DETAILS)).toBe(true);
    });

    it("returns false on testnet and futurenet by default", () => {
      expect(isBlockaidEnabled(TESTNET_NETWORK_DETAILS)).toBe(false);
      expect(isBlockaidEnabled(FUTURENET_NETWORK_DETAILS)).toBe(false);
    });

    it("returns true on testnet when running under Playwright", () => {
      (window as unknown as { IS_PLAYWRIGHT?: string }).IS_PLAYWRIGHT = "true";
      expect(isBlockaidEnabled(TESTNET_NETWORK_DETAILS)).toBe(true);
    });
  });

  describe("shouldTreatAssetAsUnableToScan precedence", () => {
    beforeEach(() => {
      process.env.DEV_EXTENSION = "true";
    });

    it("returns false on testnet without an override (network gate)", () => {
      expect(
        shouldTreatAssetAsUnableToScan(null, null, TESTNET_NETWORK_DETAILS),
      ).toBe(false);
    });

    it("respects dev override above the network gate", () => {
      expect(
        shouldTreatAssetAsUnableToScan(
          null,
          SecurityLevel.UNABLE_TO_SCAN,
          TESTNET_NETWORK_DETAILS,
        ),
      ).toBe(true);
    });

    it("falls through to scan-data when override is benign and on mainnet", () => {
      expect(
        shouldTreatAssetAsUnableToScan(null, null, MAINNET_NETWORK_DETAILS),
      ).toBe(true);
    });
  });

  describe("getSiteSecurityStates network gate", () => {
    it("returns all-false when networkDetails is null", () => {
      expect(getSiteSecurityStates(undefined, null, null)).toEqual({
        isMalicious: false,
        isSuspicious: false,
        isUnableToScan: false,
      });
    });

    it("returns all-false on testnet without an override", () => {
      expect(
        getSiteSecurityStates(null, null, TESTNET_NETWORK_DETAILS),
      ).toEqual({
        isMalicious: false,
        isSuspicious: false,
        isUnableToScan: false,
      });
    });

    it("dev override wins over the network gate", () => {
      process.env.DEV_EXTENSION = "true";
      jest.resetModules();
      jest.doMock("@shared/helpers/dev", () => ({ isDev: true }));
      const { getSiteSecurityStates: testFn } = require("../blockaid");
      expect(
        testFn(null, SecurityLevel.MALICIOUS, TESTNET_NETWORK_DETAILS),
      ).toEqual({
        isMalicious: true,
        isSuspicious: false,
        isUnableToScan: false,
      });
    });

    it("uses scan data on mainnet", () => {
      const scanData = {
        status: "hit",
        is_malicious: true,
      } as unknown as BlockAidScanSiteResult;
      expect(
        getSiteSecurityStates(scanData, null, MAINNET_NETWORK_DETAILS),
      ).toEqual({
        isMalicious: true,
        isSuspicious: false,
        isUnableToScan: false,
      });
    });
  });

  describe("network-call gating (no fetch off mainnet)", () => {
    let fetchSpy: jest.SpyInstance;

    beforeEach(() => {
      fetchSpy = jest
        .spyOn(global, "fetch")
        .mockResolvedValue(new Response("{}", { status: 200 }));
    });

    afterEach(() => {
      fetchSpy.mockRestore();
      delete (window as unknown as { IS_PLAYWRIGHT?: string }).IS_PLAYWRIGHT;
    });

    it("scanAssetBulk does not fetch off mainnet", async () => {
      jest.resetModules();
      const { scanAssetBulk } = require("../blockaid");
      const result = await scanAssetBulk(["FOO-G..."], TESTNET_NETWORK_DETAILS);
      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("reportAssetWarning does not fetch off mainnet", async () => {
      jest.resetModules();
      const { reportAssetWarning } = require("../blockaid");
      const result = await reportAssetWarning({
        address: "FOO-G...",
        details: "x",
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
      expect(result).toEqual({});
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("reportTransactionWarning does not fetch off mainnet", async () => {
      jest.resetModules();
      const { reportTransactionWarning } = require("../blockaid");
      const result = await reportTransactionWarning({
        details: "x",
        requestId: "r",
        event: "e",
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
      expect(result).toEqual({});
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
