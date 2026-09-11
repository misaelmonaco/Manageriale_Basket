const REQUIRED_KEYS = ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const;

const MIN_SECRET_LENGTH = 32;

/**
 * Fails fast at boot instead of letting a missing or placeholder secret surface
 * on the first login attempt. Runs through `ConfigModule.forRoot({ validate })`.
 */
export function validateEnv(config: Record<string, unknown>) {
  const errors: string[] = [];
  const isProduction = config.NODE_ENV === "production";

  for (const key of REQUIRED_KEYS) {
    if (!config[key]) errors.push(`${key} is required.`);
  }

  for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const) {
    const value = config[key];
    if (typeof value !== "string" || !value) continue;
    if (value.includes("change-me")) {
      errors.push(`${key} still uses the placeholder value from .env.example.`);
    }
    if (isProduction && value.length < MIN_SECRET_LENGTH) {
      errors.push(`${key} must be at least ${MIN_SECRET_LENGTH} characters in production.`);
    }
  }

  if (
    typeof config.JWT_ACCESS_SECRET === "string" &&
    config.JWT_ACCESS_SECRET === config.JWT_REFRESH_SECRET
  ) {
    errors.push("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.");
  }

  if (isProduction && !config.FRONTEND_URL) {
    errors.push("FRONTEND_URL is required in production so CORS can be restricted.");
  }

  const mailProvider = String(config.MAIL_PROVIDER ?? "").trim().toLowerCase();
  if (mailProvider && !["resend", "smtp"].includes(mailProvider)) {
    errors.push('MAIL_PROVIDER must be either "resend" or "smtp".');
  }
  if (mailProvider === "resend" && !config.RESEND_API_KEY) {
    errors.push("RESEND_API_KEY is required when MAIL_PROVIDER=resend.");
  }
  if (mailProvider === "smtp" && !config.SMTP_HOST) {
    errors.push("SMTP_HOST is required when MAIL_PROVIDER=smtp.");
  }
  if ((config.RESEND_API_KEY || config.SMTP_HOST) && !config.MAIL_FROM && !config.SMTP_FROM && !config.SMTP_USER) {
    errors.push("MAIL_FROM is required so outgoing emails have a sender address.");
  }

  if (typeof config.CRON_SECRET === "string" && config.CRON_SECRET && config.CRON_SECRET.length < 16) {
    errors.push("CRON_SECRET must be at least 16 characters.");
  }

  if (errors.length) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join("\n- ")}`);
  }

  return config;
}
