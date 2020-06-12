import { bool as YupBool, string as YupString, ref as YupRef } from "yup";

export const password = YupString()
  .min(10, "Password must be at least 10 characters long")
  .required("Password is required")
  .matches(/.*\d/, "Must contain a number")
  .matches(/.*[A-Z]/, "Must contain an uppercase letter")
  .matches(/.*[a-z]/, "Must contain a lowercase letter");

export const confirmPassword = YupString()
  .oneOf([YupRef("password")], "Passwords must match")
  .required("Password confirmation is required");

export const termsOfUse = YupBool().oneOf([true], "Terms of Use are required");
