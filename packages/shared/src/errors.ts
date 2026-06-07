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

  // clinics
  CLINIC_NOT_FOUND: "clinics.not_found",
  FORBIDDEN: "clinics.forbidden",

  // invitations
  INVITATION_NOT_FOUND: "invitations.not_found",
  INVITATION_EXPIRED: "invitations.expired",
  ALREADY_MEMBER: "invitations.already_member",

  // schedule rules
  SCHEDULE_RULE_NOT_FOUND: "schedule_rules.not_found",
  SLOT_FROM_AFTER_SLOT_TO: "schedule_rules.slot_from_after_slot_to",
  DATE_RANGE_PARTIAL: "errors.date_range_partial",
  DATE_RANGE_INVALID: "errors.date_range_invalid",

  // server
  INTERNAL_ERROR: "errors.internal",
  TOO_MANY_REQUESTS: "errors.too_many_requests",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
