import React, { createContext, useState } from "react";

interface InputWidthContextType {
  inputWidthCrypto: number;
  setInputWidthCrypto: React.Dispatch<React.SetStateAction<number>>;
  inputWidthFiat: number;
  setInputWidthFiat: React.Dispatch<React.SetStateAction<number>>;
}

export const InputWidthContext = createContext<InputWidthContextType>({
  inputWidthCrypto: 0,
  setInputWidthCrypto: () => {},
  inputWidthFiat: 0,
  setInputWidthFiat: () => {},
});

export const InputWidthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [inputWidthCrypto, setInputWidthCrypto] = useState(0);
  const [inputWidthFiat, setInputWidthFiat] = useState(0);

  return (
    <InputWidthContext.Provider
      value={{
        inputWidthCrypto,
        setInputWidthCrypto,
        inputWidthFiat,
        setInputWidthFiat,
      }}
    >
      {children}
    </InputWidthContext.Provider>
  );
};
