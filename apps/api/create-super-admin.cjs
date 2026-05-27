const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || "admin@basket.local";
  const password = process.env.SUPER_ADMIN_PASSWORD || "Admin123!";
  const username = process.env.SUPER_ADMIN_USERNAME || "superadmin";
  const firstName = process.env.SUPER_ADMIN_FIRST_NAME || "Super";
  const lastName = process.env.SUPER_ADMIN_LAST_NAME || "Admin";
  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
  const passwordHash = await bcrypt.hash(password, rounds);

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
    create: {
      email,
      username,
      firstName,
      lastName,
      passwordHash,
      role: "SUPER_ADMIN",
      birthDate: new Date("2000-01-01"),
    },
  });

  console.log(`SUPER_ADMIN pronto: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
