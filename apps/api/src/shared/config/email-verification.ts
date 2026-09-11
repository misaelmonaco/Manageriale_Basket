import { ConfigService } from "@nestjs/config";

/**
 * Whether an unverified account must be blocked from signing in.
 *
 * EMAIL_VERIFICATION_REQUIRED=true  -> always require verification
 * EMAIL_VERIFICATION_REQUIRED=false -> never block registration or login
 * (unset) -> required in production only
 *
 * Shared so the auth flow and the health report can never disagree about it.
 */
export function isEmailVerificationRequired(config: ConfigService) {
  const override = config.get<string>("EMAIL_VERIFICATION_REQUIRED");
  if (override === "true") return true;
  if (override === "false") return false;
  return config.get("NODE_ENV") === "production";
}
