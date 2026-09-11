/**
 * Bootstraps the first SUPER_ADMIN.
 *
 * Safe to run on every deploy: it does nothing once a SUPER_ADMIN exists, and
 * it never touches the password of an existing account unless the operator
 * explicitly asks for a reset with SUPER_ADMIN_RESET=true.
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const MIN_PASSWORD_LENGTH = 12;

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const reset = process.env.SUPER_ADMIN_RESET === "true";

  // Missing configuration is not an error: the deploy must not fail just
  // because nobody asked for a bootstrap account.
  if (!email || !password) {
    console.log("[seed] SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD is not set, skipping.");
    return;
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`SUPER_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const existing = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });

  if (existing && !reset) {
    console.log(`[seed] A SUPER_ADMIN already exists (${existing.email}), skipping.`);
    return;
  }

  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
  const passwordHash = await bcrypt.hash(password, rounds);

  if (existing && reset) {
    // Deliberate recovery path, gated behind an explicit flag.
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, isActive: true, emailVerifiedAt: existing.emailVerifiedAt ?? new Date() },
    });
    // Force every active session to sign in again with the new password.
    await prisma.refreshToken.updateMany({
      where: { userId: existing.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    console.log(`[seed] Password reset for SUPER_ADMIN ${existing.email}.`);
    return;
  }

  const clash = await prisma.user.findUnique({ where: { email } });
  if (clash) {
    console.log(`[seed] A user with ${email} already exists but is not a SUPER_ADMIN, skipping.`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      username: process.env.SUPER_ADMIN_USERNAME?.trim() || email.split("@")[0],
      firstName: process.env.SUPER_ADMIN_FIRST_NAME?.trim() || "Super",
      lastName: process.env.SUPER_ADMIN_LAST_NAME?.trim() || "Admin",
      passwordHash,
      role: "SUPER_ADMIN",
      birthDate: new Date("2000-01-01"),
      // Verified on creation so the first login never depends on email delivery.
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`[seed] SUPER_ADMIN created: ${email}`);
}

main()
  .catch((error) => {
    console.error("[seed] Failed to bootstrap the SUPER_ADMIN:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
