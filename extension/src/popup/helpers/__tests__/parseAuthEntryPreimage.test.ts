import { Address, hash, xdr } from "stellar-sdk";

import { getAuthEntryBoundAddress, parseAuthEntryPreimage } from "../soroban";

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

// Valid HashIdPreimage of type ENVELOPE_TYPE_SOROBAN_AUTHORIZATION
// (same fixture used by the e2e freighterApiIntegration suite)
const AUTH_ENTRY_TO_SIGN =
  "AAAACc7gMC1ZhE0yvcqRXIID3USzP7t+3BkFHqN6vt8o7NRyGVzFh1h1V3oANBPZAAAAAAAAAAGhRTk9qFLakLcWsi5wS6hhHr80ka5WABdo/8hF7QmS3QAAAARzd2FwAAAABAAAABIAAAAB0kc/9lM7RuxEsaiiUFR+T89kG7IOUk1U0cXCIDkTDesAAAASAAAAAZ+9o35h9wEnNl2hiVZHRJxsDoO3altsu023K1kAex/nAAAACgAAAAAAAAAAAAAAAAADDUAAAAAKAAAAAAAAAAAAAAAAAAGGoAAAAAEAAAAAAAAAAdJHP/ZTO0bsRLGoolBUfk/PZBuyDlJNVNHFwiA5Ew3rAAAACHRyYW5zZmVyAAAAAwAAABIAAAAAAAAAAFVmR/NPwhQJzrxxqVrqFZ83Hy9HmP4trSdB/dX7sAZjAAAAEgAAAAGhRTk9qFLakLcWsi5wS6hhHr80ka5WABdo/8hF7QmS3QAAAAoAAAAAAAAAAAAAAAAAAw1AAAAAAA==";

// Valid HashIdPreimage of type ENVELOPE_TYPE_OP_ID (6), NOT a Soroban
// authorization (same fixture used by the e2e suite)
const NON_SOROBAN_AUTH_ENTRY =
  "AAAABgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAA==";

// ---------------------------------------------------------------------------
// CAP-71 (protocol 27) fixtures, generated from the js-stellar-sdk
// `modernization` branch XDR definitions.
//
// Bound account = ed25519 0x01*32, delegate = 0x02*32, contract = 0x03*32,
// network = TESTNET, nonce = 42, signatureExpirationLedger = 1000000,
// invocation = transfer() on the contract with no args.
// ---------------------------------------------------------------------------

// ENVELOPE_TYPE_SOROBAN_AUTHORIZATION_WITH_ADDRESS HashIdPreimage
const V2_AUTH_ENTRY_PREIMAGE =
  "AAAACs7gMC1ZhE0yvcqRXIID3USzP7t+3BkFHqN6vt8o7NRyAAAAAAAAACoAD0JAAAAAAAAAAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAAAAAAABAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMAAAAIdHJhbnNmZXIAAAAAAAAAAA==";

// SorobanAuthorizationEntry with SOROBAN_CREDENTIALS_ADDRESS_V2 credentials
const V2_CREDENTIAL_AUTH_ENTRY =
  "AAAAAgAAAAAAAAAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAAAAAAAAAKgAPQkAAAAABAAAAAAAAAAEDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwAAAAh0cmFuc2ZlcgAAAAAAAAAA";

// SorobanAuthorizationEntry with SOROBAN_CREDENTIALS_ADDRESS_WITH_DELEGATES
const WITH_DELEGATES_AUTH_ENTRY =
  "AAAAAwAAAAAAAAAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAAAAAAAAAKgAPQkAAAAABAAAAAQAAAAAAAAAAAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAAAABAAAAAAAAAAAAAAABAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMAAAAIdHJhbnNmZXIAAAAAAAAAAA==";

// G-address of the 0x01*32 bound account key
const BOUND_ADDRESS =
  "GAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQDZ7H";

describe("parseAuthEntryPreimage", () => {
  it("parses a Soroban authorization preimage", () => {
    const preimage = xdr.HashIdPreimage.fromXDR(AUTH_ENTRY_TO_SIGN, "base64");
    const parsed = parseAuthEntryPreimage(preimage);

    // matches the values reachable through the raw accessor
    const sorobanAuth = preimage.sorobanAuthorization();
    expect(parsed.networkId().equals(sorobanAuth.networkId())).toBe(true);
    expect(parsed.networkId().length).toBe(32);
    expect(parsed.invocation().toXDR("base64")).toEqual(
      sorobanAuth.invocation().toXDR("base64"),
    );

    // classic (non address-bound) preimages carry no bound address
    expect(
      parsed instanceof xdr.HashIdPreimageSorobanAuthorizationWithAddress,
    ).toBe(false);
  });

  it("throws for a non-Soroban preimage variant (OP_ID)", () => {
    const preimage = xdr.HashIdPreimage.fromXDR(
      NON_SOROBAN_AUTH_ENTRY,
      "base64",
    );

    expect(() => parseAuthEntryPreimage(preimage)).toThrow(
      /unsupported authorization envelope type/,
    );
  });

  it("throws for any other envelope variant", () => {
    // Build a contract ID preimage — a valid HashIdPreimage that is not a
    // Soroban authorization, guarding the default branch against all
    // non-authorization variants.
    const preimage = xdr.HashIdPreimage.envelopeTypeContractId(
      new xdr.HashIdPreimageContractId({
        networkId: hash(Buffer.from(TESTNET_PASSPHRASE)),
        contractIdPreimage:
          xdr.ContractIdPreimage.contractIdPreimageFromAddress(
            new xdr.ContractIdPreimageFromAddress({
              address: Address.contract(Buffer.alloc(32)).toScAddress(),
              salt: Buffer.alloc(32),
            }),
          ),
      }),
    );

    expect(() => parseAuthEntryPreimage(preimage)).toThrow(
      /unsupported authorization envelope type/,
    );
  });

  it("parses a CAP-71 address-bound (V2) preimage", () => {
    const preimage = xdr.HashIdPreimage.fromXDR(
      V2_AUTH_ENTRY_PREIMAGE,
      "base64",
    );
    const parsed = parseAuthEntryPreimage(preimage);

    expect(
      parsed.networkId().equals(hash(Buffer.from(TESTNET_PASSPHRASE))),
    ).toBe(true);
    expect(parsed.invocation()).toBeDefined();

    expect(
      parsed instanceof xdr.HashIdPreimageSorobanAuthorizationWithAddress,
    ).toBe(true);
    const withAddress =
      parsed as xdr.HashIdPreimageSorobanAuthorizationWithAddress;
    expect(Address.fromScAddress(withAddress.address()).toString()).toBe(
      BOUND_ADDRESS,
    );
  });
});

describe("getAuthEntryBoundAddress", () => {
  const legacyAddressEntry = () =>
    new xdr.SorobanAuthorizationEntry({
      credentials: xdr.SorobanCredentials.sorobanCredentialsAddress(
        new xdr.SorobanAddressCredentials({
          address: new Address(BOUND_ADDRESS).toScAddress(),
          nonce: new xdr.Int64(42),
          signatureExpirationLedger: 1000000,
          signature: xdr.ScVal.scvVoid(),
        }),
      ),
      rootInvocation: new xdr.SorobanAuthorizedInvocation({
        function:
          xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
            new xdr.InvokeContractArgs({
              contractAddress: Address.contract(
                Buffer.alloc(32, 3),
              ).toScAddress(),
              functionName: "transfer",
              args: [],
            }),
          ),
        subInvocations: [],
      }),
    });

  it("returns the address for legacy ADDRESS credentials", () => {
    expect(getAuthEntryBoundAddress(legacyAddressEntry())).toBe(BOUND_ADDRESS);
  });

  it("returns undefined for source-account credentials", () => {
    const entry = legacyAddressEntry();
    entry.credentials(xdr.SorobanCredentials.sorobanCredentialsSourceAccount());
    expect(getAuthEntryBoundAddress(entry)).toBeUndefined();
  });

  it("returns the address for CAP-71 ADDRESS_V2 credentials", () => {
    const entry = xdr.SorobanAuthorizationEntry.fromXDR(
      V2_CREDENTIAL_AUTH_ENTRY,
      "base64",
    );
    expect(getAuthEntryBoundAddress(entry)).toBe(BOUND_ADDRESS);
  });

  it("returns the top-level address for CAP-71 ADDRESS_WITH_DELEGATES credentials", () => {
    const entry = xdr.SorobanAuthorizationEntry.fromXDR(
      WITH_DELEGATES_AUTH_ENTRY,
      "base64",
    );
    expect(getAuthEntryBoundAddress(entry)).toBe(BOUND_ADDRESS);
  });
});
