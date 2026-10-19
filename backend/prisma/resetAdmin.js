const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Vérification et reset du compte admin...');

  // Supprimer l'ancien admin s'il existe
  try {
    await prisma.user.delete({
      where: { email: 'admin@myshop.cm' }
    });
    console.log('🗑️ Ancien admin supprimé');
  } catch (e) {
    console.log('ℹ️ Aucun admin existant');
  }

  // Créer un nouveau hash pour le mot de passe
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('admin123', salt);
  
  console.log('🔐 Hash généré pour "admin123"');

  // Créer le nouvel admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@myshop.cm',
      password: hashedPassword,
      fullName: 'Administrateur',
      role: 'ADMIN',
      phone: '+237 6XX XXX XXX'
    }
  });

  console.log('');
  console.log('✅ Admin créé avec succès !');
  console.log('');
  console.log('📧 Email: admin@myshop.cm');
  console.log('🔑 Mot de passe: admin123');
  console.log('');
  
  // Vérifier que le mot de passe fonctionne
  const isValid = await bcrypt.compare('admin123', admin.password);
  console.log('🧪 Test du mot de passe:', isValid ? '✅ OK' : '❌ ERREUR');
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
