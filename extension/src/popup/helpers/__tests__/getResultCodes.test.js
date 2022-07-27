import { RESULT_CODES, getResultCodes } from "../parseTransaction";

describe("getResultCodes", () => {
  it("", () => {
    const testCases = [
      {
        error: {
          response: {
            type: "https://stellar.org/horizon-errors/transaction_failed",
            title: "Transaction Failed",
            status: 400,
            detail:
              "The transaction failed when submitted to the stellar network. The `extras.result_codes` field on this response contains further details.  Descriptions of each code can be found at: https://developers.stellar.org/api/errors/http-status-codes/horizon-specific/transaction-failed/",
            extras: {
              envelope_xdr:
                "AAAAAgAAAABY+dh/7qRA3e3ji+B6xB1aHgk44+Ptp6vznYjtEmG3MAAAAAEAABXJAAAAKAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAABY+dh/7qRA3e3ji+B6xB1aHgk44+Ptp6vznYjtEmG3MAAAAAAAAAAAAJiWgAAAAAAAAAABEmG3MAAAAEB1pNcafUcgZYU5uAQwt5WuyF9TDlwiaBrARYuBKXgVLv9LBCO6ko0lD9raxsGv2Q4/WyeoHEWTxv6XS54dPaUH",
              result_codes: {
                transaction: "tx_insufficient_fee",
              },
              result_xdr: "AAAAAAAAAGT////3AAAAAA==",
            },
          },
        },
        want: { transaction: RESULT_CODES.tx_insufficient_fee, operations: [] },
      },
      {
        error: {
          response: {
            type: "https://stellar.org/horizon-errors/transaction_failed",
            title: "Transaction Failed",
            status: 400,
            detail:
              "The transaction failed when submitted to the stellar network. The `extras.result_codes` field on this response contains further details.  Descriptions of each code can be found at: https://developers.stellar.org/api/errors/http-status-codes/horizon-specific/transaction-failed/",
            extras: {
              envelope_xdr:
                "AAAAAgAAAABY+dh/7qRA3e3ji+B6xB1aHgk44+Ptp6vznYjtEmG3MAAAAGQAABXJAAAAHgAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAAD49aUpVx7fhJPK6wDdlPJgkA1HkAi85qUL1tii8YSZzQAAAAAAAAAXNSb55wAAAAAAAAABEmG3MAAAAECBAEk6q0MclKA3L0nD2xPaeM2rNRbNwHDcjHu9vgzdPBfkq+RVTGXVf10qZbiEo+Goa7UDuo4rTID4cUJ/7m8C",
              result_codes: {
                transaction: "tx_failed",
                operations: ["op_underfunded"],
              },
              result_xdr: "AAAAAAAAAGT/////AAAAAQAAAAAAAAAB/////gAAAAA=",
            },
          },
        },
        want: {
          operations: [RESULT_CODES.op_underfunded],
          transaction: RESULT_CODES.tx_failed,
        },
      },
      {
        error: {
          response: {
            type: "https://stellar.org/horizon-errors/transaction_failed",
            title: "Transaction Failed",
            status: 400,
            detail:
              "The transaction failed when submitted to the stellar network. The `extras.result_codes` field on this response contains further details.  Descriptions of each code can be found at: https://developers.stellar.org/api/errors/http-status-codes/horizon-specific/transaction-failed/",
            extras: {
              envelope_xdr:
                "AAAAAgAAAABY+dh/7qRA3e3ji+B6xB1aHgk44+Ptp6vznYjtEmG3MAAAAGQAABXJAAAAHQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAAC/ikqLSMrhP2hfiqs53vWFF6zfLNU8Qcxoj5PAI6SiKAAAAAAAAAAAAJiWgAAAAAAAAAABEmG3MAAAAECIB76fXRVYVfBeWgAuHV8Wf6vUYFJufTBdD76A022YBcshU3AKg3pSJyWSvYl61h8/p72PqkIpPEeXAvaQZGAE",
              result_codes: {
                transaction: "tx_failed",
                operations: ["op_no_destination"],
              },
              result_xdr: "AAAAAAAAAGT/////AAAAAQAAAAAAAAAB////+wAAAAA=",
            },
          },
        },
        want: {
          operations: [RESULT_CODES.op_no_destination],
          transaction: RESULT_CODES.tx_failed,
        },
      },
      {
        error: {
          response: {
            type: "https://stellar.org/horizon-errors/transaction_failed",
            title: "Transaction Failed",
            status: 400,
            detail:
              "The transaction failed when submitted to the stellar network. The `extras.result_codes` field on this response contains further details.  Descriptions of each code can be found at: https://developers.stellar.org/api/errors/http-status-codes/horizon-specific/transaction-failed/",
            extras: {
              envelope_xdr:
                "AAAAAgAAAABY+dh/7qRA3e3ji+B6xB1aHgk44+Ptp6vznYjtEmG3MAAAAGQAABXJAAAAHAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAAC9Uy4RRTUY1nWcWv66yxFpZQINL3nKD6MClVXbpuYnhgAAAAFVU0RDAAAAAEI+fQXy7K+/7BkrIVo/G+lq7bjY5wJUq+NBPgIH3layAAAAAACYloAAAAAAAAAAARJhtzAAAABA7o3q2HeUOsA0VTaVCevgg4Vy/ov/KvwI3MX6E41dEfDcgjAXR56S2qx4tB2JvMiSMF9QK6oEFJwclCS7eMywCg==",
              result_codes: {
                transaction: "tx_failed",
                operations: ["op_no_trust"],
              },
              result_xdr: "AAAAAAAAAGT/////AAAAAQAAAAAAAAAB////+gAAAAA=",
            },
          },
        },
        want: {
          operations: [RESULT_CODES.op_no_trust],
          transaction: RESULT_CODES.tx_failed,
        },
      },
      {
        error: {
          response: {
            type: "https://stellar.org/horizon-errors/transaction_failed",
            title: "Transaction Failed",
            status: 400,
            detail:
              "The transaction failed when submitted to the stellar network. The `extras.result_codes` field on this response contains further details.  Descriptions of each code can be found at: https://developers.stellar.org/api/errors/http-status-codes/horizon-specific/transaction-failed/",
            extras: {
              envelope_xdr:
                "AAAAAgAAAABY+dh/7qRA3e3ji+B6xB1aHgk44+Ptp6vznYjtEmG3MAAAAGQAABXJAAAAIwAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAADQAAAAAAAAAAAJiWgAAAAAC9Uy4RRTUY1nWcWv66yxFpZQINL3nKD6MClVXbpuYnhgAAAAFVU0RDAAAAAEI+fQXy7K+/7BkrIVo/G+lq7bjY5wJUq+NBPgIH3layAAAAAACYloAAAAAAAAAAAAAAAAESYbcwAAAAQKsQwcp6XJToDsnofYm9/WWRT3gNO3QzQCbKYRuksYi1VsttamC9+eeST6kxNBqD0xHK1a+gSj3aNPut1qAmNgk=",
              result_codes: {
                transaction: "tx_failed",
                operations: ["op_under_dest_min"],
              },
              result_xdr: "AAAAAAAAAGT/////AAAAAQAAAAAAAAAN////9AAAAAA=",
            },
          },
        },
        want: {
          operations: [RESULT_CODES.op_under_dest_min],
          transaction: RESULT_CODES.tx_failed,
        },
      },
      {
        error: {
          response: {
            type: "https://stellar.org/horizon-errors/transaction_failed",
            title: "Transaction Failed",
            status: 400,
            detail:
              "The transaction failed when submitted to the stellar network. The `extras.result_codes` field on this response contains further details.  Descriptions of each code can be found at: https://developers.stellar.org/api/errors/http-status-codes/horizon-specific/transaction-failed/",
            extras: {
              envelope_xdr:
                "AAAAAgAAAADGeh2L1xN8FuJOyUux0fT+uf4LOcqB3mIrcu0A9pk+MwAAAGQAB11PAAAAAwAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAABgAAAAFVU0RDAAAAAEI+fQXy7K+/7BkrIVo/G+lq7bjY5wJUq+NBPgIH3layf/////////8AAAAAAAAAAfaZPjMAAABAhbZ/5TZHau/80kX9GzXOtDorQmfrvFvr/5YWF8OAqYVTutFmKwGzszromKeb+YlL576+lLX06Gm5Fyj9uYWBDw==",
              result_codes: {
                transaction: "tx_failed",
                operations: ["op_low_reserve"],
              },
              result_xdr: "AAAAAAAAAGT/////AAAAAQAAAAAAAAAG/////AAAAAA=",
            },
          },
        },
        want: {
          operations: [RESULT_CODES.op_low_reserve],
          transaction: RESULT_CODES.tx_failed,
        },
      },
    ];

    testCases.forEach((tc) => {
      const codes = getResultCodes(tc.error);
      expect(codes).toMatchObject(tc.want);
    });
  });
});
