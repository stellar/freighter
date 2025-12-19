import React from "react";
import { Provider } from "react-redux";
import { renderHook } from "@testing-library/react";
import {
  isAssetUnableToScan,
  isTxUnableToScan,
  shouldTreatTxAsUnableToScan,
  isTxSuspicious,
  useIsTxSuspicious,
  useShouldTreatTxAsUnableToScan,
} from "../blockaid";
import { SecurityLevel } from "popup/constants/blockaid";
import {
  BlockAidScanAssetResult,
  BlockAidScanTxResult,
} from "@shared/api/types";
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
        ),
      ).toBe(true);
    });

    it("should return false when debug override is not UNABLE_TO_SCAN (dev mode)", () => {
      expect(
        shouldTreatTxAsUnableToScan(
          { simulation: {} } as BlockAidScanTxResult,
          SecurityLevel.SAFE,
        ),
      ).toBe(false);
    });

    it("should return true when blockaidData is unable to scan (no override)", () => {
      expect(shouldTreatTxAsUnableToScan(null, null)).toBe(true);
    });

    it("should return false when blockaidData is valid (no override)", () => {
      expect(
        shouldTreatTxAsUnableToScan(
          { simulation: {} } as BlockAidScanTxResult,
          null,
        ),
      ).toBe(false);
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

      const { useIsTxSuspicious: testHook } = require("../blockaid");

      const store = makeDummyStore({
        settings: {
          overriddenBlockaidResponse: SecurityLevel.SUSPICIOUS,
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

      const { result } = renderHook(() => testHook(), {
        wrapper: Wrapper,
      });

      expect(
        result.current({
          validation: { result_type: "Benign" },
        } as BlockAidScanTxResult),
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

      const {
        useShouldTreatTxAsUnableToScan: testHook,
      } = require("../blockaid");

      const store = makeDummyStore({
        settings: {
          overriddenBlockaidResponse: SecurityLevel.UNABLE_TO_SCAN,
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

      const { result } = renderHook(() => testHook(), {
        wrapper: Wrapper,
      });

      expect(result.current({ simulation: {} } as BlockAidScanTxResult)).toBe(
        false,
      );
    });
  });
});
