import { Balances } from "@shared/api/types";

export const sortBalances = (balances: Balances) => {
  const collection = [] as Array<any>;
  if (!balances) return collection;

  // put XLM at the top of the balance list
  Object.entries(balances).forEach(([k, v]) => {
    if (k === "native") {
      collection.unshift(v);
    } else if (!k.includes(":lp")) {
      collection.push(v);
    }
  });

  return collection;
};
