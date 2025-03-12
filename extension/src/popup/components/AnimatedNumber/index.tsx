import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import classNames from "classnames";

import "./styles.scss";

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
  const valueClasses = classNames("animated-number", valueAddlClasses);
  return (
    <div className={cardClasses}>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={value}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={valueClasses}
          {...valueAddlProperties}
        >
          {value}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
