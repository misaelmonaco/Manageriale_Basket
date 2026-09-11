import { validateEnv } from "./env.validation";

const valid = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://basket:basket@localhost:5432/basket",
  JWT_ACCESS_SECRET: "a".repeat(40),
  JWT_REFRESH_SECRET: "b".repeat(40),
};

describe("validateEnv", () => {
  it("accepts a complete configuration", () => {
    expect(() => validateEnv({ ...valid })).not.toThrow();
  });

  it("rejects a missing database url or secret", () => {
    expect(() => validateEnv({ ...valid, DATABASE_URL: "" })).toThrow(/DATABASE_URL is required/);
    expect(() => validateEnv({ ...valid, JWT_ACCESS_SECRET: "" })).toThrow(/JWT_ACCESS_SECRET is required/);
  });

  it("rejects the placeholder secrets shipped in .env.example", () => {
    expect(() => validateEnv({ ...valid, JWT_ACCESS_SECRET: "change-me-access-secret" })).toThrow(/placeholder/);
  });

  it("rejects reusing one secret for both tokens", () => {
    const shared = "c".repeat(40);
    expect(() => validateEnv({ ...valid, JWT_ACCESS_SECRET: shared, JWT_REFRESH_SECRET: shared })).toThrow(/must be different/);
  });

  it("requires long secrets and a frontend url in production", () => {
    const production = { ...valid, NODE_ENV: "production", FRONTEND_URL: "https://example.com" };
    expect(() => validateEnv({ ...production, JWT_ACCESS_SECRET: "short" })).toThrow(/at least 32 characters/);
    expect(() => validateEnv({ ...production, FRONTEND_URL: "" })).toThrow(/FRONTEND_URL is required/);
  });

  it("tolerates short secrets outside production", () => {
    expect(() => validateEnv({ ...valid, JWT_ACCESS_SECRET: "short-but-dev" })).not.toThrow();
  });

  it("checks the mail provider against its own requirements", () => {
    expect(() => validateEnv({ ...valid, MAIL_PROVIDER: "carrier-pigeon" })).toThrow(/MAIL_PROVIDER/);
    expect(() => validateEnv({ ...valid, MAIL_PROVIDER: "resend" })).toThrow(/RESEND_API_KEY is required/);
    expect(() => validateEnv({ ...valid, MAIL_PROVIDER: "smtp" })).toThrow(/SMTP_HOST is required/);
    expect(() =>
      validateEnv({ ...valid, MAIL_PROVIDER: "resend", RESEND_API_KEY: "re_key", MAIL_FROM: "a@b.co" }),
    ).not.toThrow();
  });

  it("rejects a cron secret that is too short to be useful", () => {
    expect(() => validateEnv({ ...valid, CRON_SECRET: "tooshort" })).toThrow(/CRON_SECRET/);
    expect(() => validateEnv({ ...valid, CRON_SECRET: "x".repeat(32) })).not.toThrow();
  });

  it("reports every problem at once instead of one per restart", () => {
    expect(() => validateEnv({ NODE_ENV: "development" })).toThrow(/DATABASE_URL[\s\S]*JWT_ACCESS_SECRET[\s\S]*JWT_REFRESH_SECRET/);
  });
});
