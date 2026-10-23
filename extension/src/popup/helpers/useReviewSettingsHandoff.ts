import { MutableRefObject, useCallback, useRef } from "react";

interface Args {
  setIsReviewingTx: (open: boolean) => void;
  setIsEditingSettings: (open: boolean) => void;
  /** The review's "leaving is not a rejection" flag. */
  skipRejectionRef: MutableRefObject<boolean>;
}

/**
 * The review footer's gear closes the review, opens the settings sheet, and
 * brings the review back when settings close by any route. `returnToReview`
 * is separate so a save can re-simulate before the review reappears.
 */
export const useReviewSettingsHandoff = ({
  setIsReviewingTx,
  setIsEditingSettings,
  skipRejectionRef,
}: Args) => {
  const fromReviewRef = useRef(false);

  const openSettingsFromReview = useCallback(() => {
    // Editing settings is not a decision on the transaction.
    skipRejectionRef.current = true;
    fromReviewRef.current = true;
    setIsReviewingTx(false);
    setIsEditingSettings(true);
  }, [setIsReviewingTx, setIsEditingSettings, skipRejectionRef]);

  const returnToReview = useCallback(() => {
    if (fromReviewRef.current) {
      fromReviewRef.current = false;
      setIsReviewingTx(true);
    }
  }, [setIsReviewingTx]);

  const closeSettings = useCallback(() => {
    setIsEditingSettings(false);
    returnToReview();
  }, [setIsEditingSettings, returnToReview]);

  return { openSettingsFromReview, closeSettings, returnToReview };
};
