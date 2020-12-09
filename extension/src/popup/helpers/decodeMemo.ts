import buffer from "buffer";
import { get } from "lodash";

import { MEMO_TYPES } from "popup/constants/memoTypes";

export const decodeMemo = (_memo: {}) => {
  const memoType = get(_memo, "_switch.name", "");

  if (memoType === MEMO_TYPES.MEMO_ID) {
    return get(_memo, "_value.low", "");
  }
  const decodeMethod = memoType === MEMO_TYPES.MEMO_HASH ? "hex" : "utf-8";
  return buffer.Buffer.from(get(_memo, "_value.data", "")).toString(
    decodeMethod,
  );
};
