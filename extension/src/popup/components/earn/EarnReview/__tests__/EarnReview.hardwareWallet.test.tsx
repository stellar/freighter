import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Keypair, TransactionBuilder, Account } from "stellar-sdk";

import { WalletType } from "@shared/constants/hardwareWallet";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import {
  BlendRequestType,
  buildBlendRequestScVal,
  buildBlendSubmitOp,
} from "@shared/helpers/soroban/blend";
import { RequestState } from "constants/request";
import { EarnReview } from "popup/components/earn/EarnReview";
import {
  initialState as transactionSubmissionInitialState,
  ShowOverlayStatus,
} from "popup/ducks/transactionSubmission";
import { getTestStore, Wrapper } from "popup/__testHelpers__";

// A real keypair and a real envelope: signWithHardwareWallet rebuilds the
// transaction from the XDR and appends a DecoratedSignature, so a stand-in
// string would never round-trip.
const deviceKeypair = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 7));
const TEST_PUBLIC_KEY = deviceKeypair.publicKey();

const POOL_ID = "CAJJZSGMMM3PD7N33TAPHGBUGTB43OC73HVIK2L2G6BNGGGYOSSYBXBD";
const USDC_SAC = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";

const { networkPassphrase } = TESTNET_NETWORK_DETAILS;

// The deposit the user is reviewing: pool.submit with one SupplyCollateral
// request, built through the same helpers the flow uses.
const buildDepositXdr = () =>
  new TransactionBuilder(new Account(TEST_PUBLIC_KEY, "1"), {
    fee: "100",
    networkPassphrase,
  })
    .addOperation(
      buildBlendSubmitOp({
        poolId: POOL_ID,
        publicKey: TEST_PUBLIC_KEY,
        requests: [
          buildBlendRequestScVal({
            assetId: USDC_SAC,
            amount: "5000000",
            requestType: BlendRequestType.SupplyCollateral,
            networkPassphrase,
          }),
        ],
        networkPassphrase,
      }),
    )
    .setTimeout(180)
    .build()
    .toXDR();

const mockGetWalletPublicKey = jest.fn();
const mockHardwareSign = jest.fn();

jest.mock("popup/helpers/hardwareConnect", () => {
  const actual = jest.requireActual("popup/helpers/hardwareConnect");
  return {
    ...actual,
    getWalletPublicKey: {
      Ledger: (...args: unknown[]) => mockGetWalletPublicKey(...args),
    },
    hardwareSign: {
      Ledger: (...args: unknown[]) => mockHardwareSign(...args),
    },
  };
});

const renderReview = ({
  preparedXdr,
  hardwareWalletType,
  hwStatus = ShowOverlayStatus.IDLE,
  onConfirm,
  onCancel = jest.fn(),
}: {
  preparedXdr: string;
  hardwareWalletType: WalletType;
  hwStatus?: ShowOverlayStatus;
  onConfirm: () => void;
  onCancel?: () => void;
}) =>
  render(
    <Wrapper
      routes={["/"]}
      state={{
        auth: {
          allAccounts: [{ publicKey: TEST_PUBLIC_KEY, hardwareWalletType }],
          publicKey: TEST_PUBLIC_KEY,
          bipPath: "44'/148'/0'",
        },
        settings: {
          networkDetails: TESTNET_NETWORK_DETAILS,
          isHashSigningEnabled: false,
        },
        transactionSubmission: {
          ...transactionSubmissionInitialState,
          transactionSimulation: {
            response: null,
            preparedTransaction: preparedXdr,
          },
          hardwareWalletData: {
            status: hwStatus,
            transactionXDR:
              hwStatus === ShowOverlayStatus.IN_PROGRESS ? preparedXdr : "",
            shouldSubmit: true,
          },
        },
      }}
    >
      <EarnReview
        pool={null}
        assetCode="USDC"
        assetIssuer={USDC_SAC}
        assetIcon={null}
        amount="0.5"
        amountUsd="0.50"
        apy={0.05}
        currentPosition="0"
        currentPositionUsd="0"
        fee="0.001"
        simulationState={{
          state: RequestState.SUCCESS,
          data: {
            transactionXdr: preparedXdr,
            scanResult: null,
            inclusionFee: "0.00001",
            resourceFee: "0.0546",
          },
          error: null,
        }}
        networkDetails={TESTNET_NETWORK_DETAILS}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </Wrapper>,
  );

describe("EarnReview hardware wallet signing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWalletPublicKey.mockResolvedValue(TEST_PUBLIC_KEY);
    mockHardwareSign.mockImplementation(({ tx }) =>
      Promise.resolve(deviceKeypair.sign(tx.signatureBase())),
    );
  });

  it("asks the device to sign rather than stepping to the terminal", async () => {
    // The regression: Confirm went straight to the deposit terminal, which
    // submits on mount — posting an unsigned envelope for tx_bad_auth, with the
    // device never prompted. Confirm must hand the XDR to startHwSign instead.
    const preparedXdr = buildDepositXdr();

    renderReview({
      preparedXdr,
      hardwareWalletType: WalletType.LEDGER,
      onConfirm: jest.fn(),
    });

    await userEvent.click(screen.getByTestId("earn-review-confirm"));

    expect(await screen.findByTestId("HardwareSign__internal")).toBeDefined();
    expect(
      getTestStore()!.getState().transactionSubmission.hardwareWalletData,
    ).toEqual({
      status: ShowOverlayStatus.IN_PROGRESS,
      transactionXDR: preparedXdr,
      shouldSubmit: true,
    });
  });

  it("does not advance the flow when the device refuses", async () => {
    // The other half of the regression: with no signature there is nothing
    // submittable, so the flow must stay on the review rather than walk into a
    // terminal that would post the unsigned envelope.
    const preparedXdr = buildDepositXdr();
    const onConfirm = jest.fn();
    mockHardwareSign.mockRejectedValue(
      new Error("Transaction approval denied"),
    );

    renderReview({
      preparedXdr,
      hardwareWalletType: WalletType.LEDGER,
      hwStatus: ShowOverlayStatus.IN_PROGRESS,
      onConfirm,
    });

    await waitFor(() =>
      expect(screen.getByTestId("HardwareSign__connect-text")).toBeDefined(),
    );

    expect(onConfirm).not.toHaveBeenCalled();
    expect(
      getTestStore()!.getState().transactionSubmission.transactionSimulation
        .preparedTransaction,
    ).toEqual(preparedXdr);
  });

  it("shows the device overlay in place of the review body", async () => {
    renderReview({
      preparedXdr: buildDepositXdr(),
      hardwareWalletType: WalletType.LEDGER,
      hwStatus: ShowOverlayStatus.IN_PROGRESS,
      onConfirm: jest.fn(),
    });

    expect(await screen.findByTestId("HardwareSign__internal")).toBeDefined();
    expect(screen.queryByTestId("earn-review")).toBeNull();
  });

  it("writes the signed envelope to redux, then advances the flow", async () => {
    // This is what makes the deposit terminal's "already signed" assumption
    // true: HardwareSign replaces preparedTransaction with the signed envelope
    // before onSubmit steps the flow forward.
    const preparedXdr = buildDepositXdr();
    const onConfirm = jest.fn();

    renderReview({
      preparedXdr,
      hardwareWalletType: WalletType.LEDGER,
      hwStatus: ShowOverlayStatus.IN_PROGRESS,
      onConfirm,
    });

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));

    const { preparedTransaction } =
      getTestStore()!.getState().transactionSubmission.transactionSimulation;
    expect(preparedTransaction).not.toEqual(preparedXdr);

    const signed = TransactionBuilder.fromXDR(
      preparedTransaction!,
      networkPassphrase,
    );
    expect(signed.signatures).toHaveLength(1);
    expect(
      deviceKeypair.verify(
        signed.signatureBase(),
        signed.signatures[0].signature(),
      ),
    ).toBe(true);
  });

  it("confirms directly for a software wallet", async () => {
    const onConfirm = jest.fn();

    renderReview({
      preparedXdr: buildDepositXdr(),
      hardwareWalletType: WalletType.NONE,
      onConfirm,
    });

    await userEvent.click(screen.getByTestId("earn-review-confirm"));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(
      getTestStore()!.getState().transactionSubmission.hardwareWalletData
        .status,
    ).toEqual(ShowOverlayStatus.IDLE);
  });
});
