const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Configurer Super Admin
  const result = await prisma.user.updateMany({
    where: { email: 'valdeslando15@gmail.com' },
    data: { role: 'SUPER_ADMIN' }
  });
  console.log('Super Admin configuré:', result);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
