import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import classNames from "classnames";

import "./styles.scss";

const convertToNumber = (value: string) => {
  const cleanedValue = value.replace(/[$,]/g, ""); // Remove dollar signs and commas
  return parseFloat(cleanedValue); // Convert the cleaned string to a number
};

interface AnimatedNumberProps {
  value: string;
  containerAddlClasses?: string;
  valueAddlClasses?: string;
  valueAddlProperties?: Record<string, string>;
}

export const AnimatedNumber = ({
  value,
  containerAddlClasses,
  valueAddlClasses,
  valueAddlProperties,
}: AnimatedNumberProps) => {
  const cardClasses = classNames(
    "animated-number-container",
    containerAddlClasses,
  );
  const prevValueRef = useRef<string>(value);
  const isFirstRender = useRef<boolean>(true);
  const [animatedDigits, setAnimatedDigits] = useState<string[]>(
    value.split(""),
  );
  const [colorMap, setColorMap] = useState<Record<number, string>>({});

  useEffect(() => {
    const prevValue = prevValueRef.current;
    const newDigits = value.split("");

    const getTransitionFrames = (from: string, to: string) => {
      if (!/^\d$/.test(from) || !/^\d$/.test(to)) {
        return [to]; // Keep non-numeric characters static
      }
      const start = Number(from);
      const end = Number(to);
      const frames = [];
      for (let i = start; i !== end; i = (i + 1) % 10) {
        frames.push(i.toString());
      }
      frames.push(to); // Ensure final value is included
      return frames;
    };

    // Generate animated transitions for each digit
    const transitions = newDigits.map((digit, index) => {
      const prevDigit = prevValue[index] || "0"; // Default to '0' for new digits
      return getTransitionFrames(prevDigit, digit);
    });

    let frameIndex = 0;
    const maxFrames = Math.max(...transitions.map((t) => t.length), 1);
    const interval = setInterval(() => {
      setAnimatedDigits(() =>
        newDigits.map((_, idx) => {
          const transition = transitions[idx] || [newDigits[idx]]; // Ensure transition array exists
          return transition[frameIndex] || transition.slice(-1)[0]; // Default to last value if out of bounds
        }),
      );

      // dont show color transition on first render
      if (!isFirstRender.current) {
        setColorMap((prevColorMap) => {
          const prevNumeric = convertToNumber(prevValue || "0");
          const newNumeric = convertToNumber(value || "0");
          const newColorMap = { ...prevColorMap };
          newDigits.forEach((digit, idx) => {
            const prevDigit = prevValue[idx] || "0";
            if (
              !/\d/.test(digit) ||
              prevDigit === digit ||
              prevNumeric === 0.0
            ) {
              return; // Skip non-numeric characters or characters that didnt change
            }

            if (newNumeric > prevNumeric) {
              newColorMap[idx] = "positive";
            } else if (newNumeric < prevNumeric) {
              newColorMap[idx] = "negative";
            }
          });
          return newColorMap;
        });
      }

      frameIndex += 1;
      if (frameIndex >= maxFrames) {
        clearInterval(interval);
        // Reset colors back to white after transition completes
        setTimeout(() => {
          setColorMap({});
        }, 50);
      }
    }, (0.3 * 1000) / 10); // Adjust timing to match duration

    prevValueRef.current = value;
    isFirstRender.current = false;
    return () => clearInterval(interval);
  }, [value]);

  return (
    <div className={cardClasses}>
      <div
        className={classNames("animated-number", valueAddlClasses)}
        {...valueAddlProperties}
      >
        {animatedDigits.map((digit, index) => (
          <motion.span
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={classNames("digit", colorMap[index])}
          >
            {digit}
          </motion.span>
        ))}
      </div>
    </div>
  );
};
