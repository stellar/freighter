/**
 * Tests for muxed address helper functions
 */
import {
  checkIsMuxedSupported,
  getMemoDisabledState,
  determineMuxedDestination,
} from "../muxedAddress";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import * as ApiInternal from "@shared/api/internal";
import * as StellarHelpers from "helpers/stellar";
import * as SorobanHelpers from "popup/helpers/soroban";
import { StrKey } from "stellar-sdk";

// Mock dependencies
jest.mock("@shared/api/internal");
jest.mock("helpers/stellar");
jest.mock("popup/helpers/soroban");

const mockGetContractSpec = ApiInternal.getContractSpec as jest.MockedFunction<
  typeof ApiInternal.getContractSpec
>;
const mockIsMuxedAccount = StellarHelpers.isMuxedAccount as jest.MockedFunction<
  typeof StellarHelpers.isMuxedAccount
>;
const mockIsValidStellarAddress =
  StellarHelpers.isValidStellarAddress as jest.MockedFunction<
    typeof StellarHelpers.isValidStellarAddress
  >;
const mockCreateMuxedAccount =
  StellarHelpers.createMuxedAccount as jest.MockedFunction<
    typeof StellarHelpers.createMuxedAccount
  >;
const mockGetBaseAccount = StellarHelpers.getBaseAccount as jest.MockedFunction<
  typeof StellarHelpers.getBaseAccount
>;
const mockIsFederationAddress =
  StellarHelpers.isFederationAddress as jest.MockedFunction<
    typeof StellarHelpers.isFederationAddress
  >;
const mockIsContractId = SorobanHelpers.isContractId as jest.MockedFunction<
  typeof SorobanHelpers.isContractId
>;

const mockT = jest.fn((key: string) => `translated:${key}`);

// Mock StrKey.isValidEd25519PublicKey
jest.spyOn(StrKey, "isValidEd25519PublicKey");

const networkDetails = TESTNET_NETWORK_DETAILS;
const gAddress = "GDQOFC6SKCNBHPLZ7NXQ6MCKFIYUUFVOWYGNWQCXC2F4AYZ27EUWYWH";
const mAddress =
  "MBSYFNGOTEFXZW5LXRD6DSRZ5OEARI57YKFNQIZGC3ZG6VGRUSNGMAAAAAAAAAAE2L2IK";
const contractId = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB2B";
const testContractId = "TEST_CONTRACT_ID";

describe("muxedAddress helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset StrKey mock
    (StrKey.isValidEd25519PublicKey as jest.Mock).mockClear();
  });

  describe("checkIsMuxedSupported", () => {
    it("should return true when contract spec has to_muxed in properties", async () => {
      mockGetContractSpec.mockResolvedValue({
        definitions: {
          transfer: {
            properties: {
              args: {
                properties: {
                  to_muxed: {
                    type: "object",
                  },
                },
                required: ["to_muxed"],
              },
            },
          },
        },
      });

      const result = await checkIsMuxedSupported({
        contractId: testContractId,
        networkDetails,
      });

      expect(result).toBe(true);
      expect(mockGetContractSpec).toHaveBeenCalledWith({
        contractId: testContractId,
        networkDetails,
      });
    });

    it("should return true when to_muxed is in required array", async () => {
      mockGetContractSpec.mockResolvedValue({
        definitions: {
          transfer: {
            properties: {
              args: {
                properties: {
                  to: {
                    type: "object",
                  },
                },
                required: ["to_muxed"],
              },
            },
          },
        },
      });

      const result = await checkIsMuxedSupported({
        contractId: testContractId,
        networkDetails,
      });

      expect(result).toBe(true);
    });

    it("should return false when contract spec has only 'to' parameter", async () => {
      mockGetContractSpec.mockResolvedValue({
        definitions: {
          transfer: {
            properties: {
              args: {
                properties: {
                  to: {
                    type: "object",
                  },
                },
                required: ["to"],
              },
            },
          },
        },
      });

      const result = await checkIsMuxedSupported({
        contractId: testContractId,
        networkDetails,
      });

      expect(result).toBe(false);
    });

    it("should return false when transfer function does not exist", async () => {
      mockGetContractSpec.mockResolvedValue({
        definitions: {},
      });

      const result = await checkIsMuxedSupported({
        contractId: testContractId,
        networkDetails,
      });

      expect(result).toBe(false);
    });

    it("should return false on error fetching contract spec", async () => {
      mockGetContractSpec.mockRejectedValue(new Error("Network error"));

      const result = await checkIsMuxedSupported({
        contractId: testContractId,
        networkDetails,
      });

      expect(result).toBe(false);
    });
  });

  describe("getMemoDisabledState", () => {
    it("should disable memo for M addresses", () => {
      mockIsMuxedAccount.mockReturnValue(true);

      const result = getMemoDisabledState({
        targetAddress: mAddress,
        t: mockT,
      });

      expect(result.isMemoDisabled).toBe(true);
      expect(result.memoDisabledMessage).toBe(
        "translated:Memo is disabled for this transaction",
      );
    });

    it("should allow memo for classic transactions (no contract)", () => {
      mockIsMuxedAccount.mockReturnValue(false);

      const result = getMemoDisabledState({
        targetAddress: gAddress,
        t: mockT,
      });

      expect(result.isMemoDisabled).toBe(false);
      expect(result.memoDisabledMessage).toBeUndefined();
    });

    it("should disable memo when contract does not support muxed (contractSupportsMuxed === false)", () => {
      mockIsMuxedAccount.mockReturnValue(false);
      mockIsContractId.mockReturnValue(false);
      mockIsValidStellarAddress.mockReturnValue(true);

      const result = getMemoDisabledState({
        targetAddress: gAddress,
        contractId: testContractId,
        contractSupportsMuxed: false,
        t: mockT,
      });

      expect(result.isMemoDisabled).toBe(true);
      expect(result.memoDisabledMessage).toBe(
        "translated:Memo is not supported for this operation",
      );
    });

    it("should allow memo when contract supports muxed (contractSupportsMuxed === true)", () => {
      mockIsMuxedAccount.mockReturnValue(false);
      mockIsContractId.mockReturnValue(false);
      mockIsValidStellarAddress.mockReturnValue(true);

      const result = getMemoDisabledState({
        targetAddress: gAddress,
        contractId: testContractId,
        contractSupportsMuxed: true,
        t: mockT,
      });

      expect(result.isMemoDisabled).toBe(false);
      expect(result.memoDisabledMessage).toBeUndefined();
    });

    it("should disable memo when contractSupportsMuxed is null (still checking)", () => {
      mockIsMuxedAccount.mockReturnValue(false);
      mockIsContractId.mockReturnValue(false);
      mockIsValidStellarAddress.mockReturnValue(true);

      const result = getMemoDisabledState({
        targetAddress: gAddress,
        contractId: testContractId,
        contractSupportsMuxed: null,
        t: mockT,
      });

      expect(result.isMemoDisabled).toBe(true);
      expect(result.memoDisabledMessage).toBe(
        "translated:Memo is not supported for this operation",
      );
    });

    it("should disable memo for contract addresses (C addresses)", () => {
      mockIsMuxedAccount.mockReturnValue(false);
      mockIsContractId.mockReturnValue(true);

      const result = getMemoDisabledState({
        targetAddress: contractId,
        contractId: testContractId,
        contractSupportsMuxed: true,
        t: mockT,
      });

      expect(result.isMemoDisabled).toBe(true);
      expect(result.memoDisabledMessage).toBe(
        "translated:Memo is not supported for this operation",
      );
    });

    it("should disable memo for invalid addresses", () => {
      mockIsMuxedAccount.mockReturnValue(false);
      mockIsValidStellarAddress.mockReturnValue(false);

      const result = getMemoDisabledState({
        targetAddress: "invalid-address",
        contractId: testContractId,
        contractSupportsMuxed: true,
        t: mockT,
      });

      expect(result.isMemoDisabled).toBe(true);
      expect(result.memoDisabledMessage).toBe(
        "translated:Memo is not supported for this operation",
      );
    });

    it("should return false when targetAddress is empty", () => {
      const result = getMemoDisabledState({
        targetAddress: "",
        t: mockT,
      });

      expect(result.isMemoDisabled).toBe(false);
      expect(result.memoDisabledMessage).toBeUndefined();
    });
  });

  describe("determineMuxedDestination", () => {
    beforeEach(() => {
      // Default mocks
      mockIsFederationAddress.mockReturnValue(false);
      mockIsContractId.mockReturnValue(false);
    });

    describe("when contract supports muxed", () => {
      it("should create muxed address when G address and memo provided", () => {
        const newMuxed = "MNEW_MUXED_ADDRESS";
        mockIsMuxedAccount.mockReturnValue(false);
        (StrKey.isValidEd25519PublicKey as jest.Mock).mockReturnValue(true);
        mockCreateMuxedAccount.mockReturnValue(newMuxed);

        const result = determineMuxedDestination({
          recipientAddress: gAddress,
          transactionMemo: "1234",
          contractSupportsMuxed: true,
        });

        expect(mockCreateMuxedAccount).toHaveBeenCalledWith(gAddress, "1234");
        expect(result).toBe(newMuxed);
      });

      it("should return G address as-is when no memo provided", () => {
        mockIsMuxedAccount.mockReturnValue(false);
        (StrKey.isValidEd25519PublicKey as jest.Mock).mockReturnValue(true);

        const result = determineMuxedDestination({
          recipientAddress: gAddress,
          transactionMemo: undefined,
          contractSupportsMuxed: true,
        });

        expect(mockCreateMuxedAccount).not.toHaveBeenCalled();
        expect(result).toBe(gAddress);
      });

      it("should return G address as-is when empty memo provided", () => {
        mockIsMuxedAccount.mockReturnValue(false);
        (StrKey.isValidEd25519PublicKey as jest.Mock).mockReturnValue(true);

        const result = determineMuxedDestination({
          recipientAddress: gAddress,
          transactionMemo: "",
          contractSupportsMuxed: true,
        });

        expect(mockCreateMuxedAccount).not.toHaveBeenCalled();
        expect(result).toBe(gAddress);
      });

      it("should return M address as-is when memo provided (memo is encoded in M address, cannot be overwritten)", () => {
        mockIsMuxedAccount.mockReturnValue(true);

        const result = determineMuxedDestination({
          recipientAddress: mAddress,
          transactionMemo: "5678",
          contractSupportsMuxed: true,
        });

        // M addresses already have memo encoded - should never be overwritten
        expect(mockGetBaseAccount).not.toHaveBeenCalled();
        expect(mockCreateMuxedAccount).not.toHaveBeenCalled();
        expect(result).toBe(mAddress);
      });

      it("should return M address as-is when no memo provided", () => {
        mockIsMuxedAccount.mockReturnValue(true);

        const result = determineMuxedDestination({
          recipientAddress: mAddress,
          transactionMemo: undefined,
          contractSupportsMuxed: true,
        });

        expect(result).toBe(mAddress);
      });

      it("should not create muxed for federation addresses", () => {
        mockIsMuxedAccount.mockReturnValue(false);
        (StrKey.isValidEd25519PublicKey as jest.Mock).mockReturnValue(true);
        mockIsFederationAddress.mockReturnValue(true);

        const result = determineMuxedDestination({
          recipientAddress: gAddress,
          transactionMemo: "1234",
          contractSupportsMuxed: true,
        });

        expect(mockCreateMuxedAccount).not.toHaveBeenCalled();
        expect(result).toBe(gAddress);
      });

      it("should not create muxed for contract IDs", () => {
        mockIsMuxedAccount.mockReturnValue(false);
        (StrKey.isValidEd25519PublicKey as jest.Mock).mockReturnValue(true);
        mockIsContractId.mockReturnValue(true);

        const result = determineMuxedDestination({
          recipientAddress: contractId,
          transactionMemo: "1234",
          contractSupportsMuxed: true,
        });

        expect(mockCreateMuxedAccount).not.toHaveBeenCalled();
        expect(result).toBe(contractId);
      });
    });

    describe("when contract does not support muxed", () => {
      it("should throw error when M address is provided (contract does not support muxed)", () => {
        mockIsMuxedAccount.mockReturnValue(true);

        expect(() =>
          determineMuxedDestination({
            recipientAddress: mAddress,
            transactionMemo: undefined,
            contractSupportsMuxed: false,
          }),
        ).toThrow("This contract does not support muxed addresses");

        // Should not try to extract base address
        expect(mockGetBaseAccount).not.toHaveBeenCalled();
      });

      it("should return G address as-is", () => {
        mockIsMuxedAccount.mockReturnValue(false);
        (StrKey.isValidEd25519PublicKey as jest.Mock).mockReturnValue(true);

        const result = determineMuxedDestination({
          recipientAddress: gAddress,
          transactionMemo: "1234",
          contractSupportsMuxed: false,
        });

        expect(result).toBe(gAddress);
      });

      it("should return contract ID as-is", () => {
        mockIsMuxedAccount.mockReturnValue(false);
        (StrKey.isValidEd25519PublicKey as jest.Mock).mockReturnValue(false);

        const result = determineMuxedDestination({
          recipientAddress: contractId,
          transactionMemo: "1234",
          contractSupportsMuxed: false,
        });

        expect(result).toBe(contractId);
      });
    });
  });
});
