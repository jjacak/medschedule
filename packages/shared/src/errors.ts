export const ErrorCode = {
  // generic
  VALIDATION: "errors.validation",
  INVALID_EMAIL: "errors.invalid_email",
  STRING_TOO_SMALL: "errors.string_too_small",
  INVALID_VALUE: "errors.invalid_value",

  // auth
  UNAUTHORIZED: "auth.unauthorized",
  EMAIL_TAKEN: "auth.register.email_taken",
  INVALID_CREDENTIALS: "auth.login.invalid_credentials",
  USER_NOT_FOUND: "auth.user_not_found",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
