const { PrismaClient } = require("@prisma/client");
const argon2 = require("argon2");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await argon2.hash("Admin123!");

  await prisma.user.upsert({
    where: { email: "admin@basket.local" },
    update: {
      passwordHash,
      role: "SUPER_ADMIN"
    },
    create: {
      email: "admin@basket.local",
      name: "Super Admin",
      passwordHash,
      role: "SUPER_ADMIN"
    }
  });

  console.log("SUPER_ADMIN creato: admin@basket.local / Admin123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
