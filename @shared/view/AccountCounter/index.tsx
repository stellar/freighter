import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { decrement, increment } from "../ducks/account";

import Account from "../Account";

interface CounterProps {
  accountName: string;
  textColor: string;
}

export function AccountCounter({ accountName, textColor }: CounterProps) {
  const count = useSelector((state: any) => state.counter.value);
  const dispatch = useDispatch();

  return (
    <Account
      accountName={accountName}
      textColor={textColor}
      count={count}
      handleIncrement={() => dispatch(increment())}
      handleDecrement={() => dispatch(decrement())}
    />
  );
}
