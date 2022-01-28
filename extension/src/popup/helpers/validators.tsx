import { bool as YupBool, string as YupString, ref as YupRef } from "yup";

export const password = YupString()
  .min(8, "Password must be at least 8 characters long")
  .required("Password is required")
  .matches(/.*[A-Z]/, "Must contain an uppercase letter");

export const confirmPassword = YupString()
  .oneOf([YupRef("password")], "Passwords must match")
  .required("Password confirmation is required");

export const termsOfUse = YupBool().oneOf(
  [true],
  "Agreeing to the Terms of Use and the Privacy Policy is required",
);

export const mnemonicPhrase = YupString().required("Backup phrase is required");
