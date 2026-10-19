const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Créer un admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@myshop.cm' },
    update: {},
    create: {
      email: 'admin@myshop.cm',
      password: hashedPassword,
      fullName: 'Administrateur',
      role: 'ADMIN',
      phone: '+237 6XX XXX XXX'
    }
  });
  console.log('✅ Admin créé:', admin.email);

  // Créer un utilisateur test
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@myshop.cm' },
    update: {},
    create: {
      email: 'user@myshop.cm',
      password: userPassword,
      fullName: 'Client Test',
      role: 'USER',
      phone: '+237 6XX XXX XXX'
    }
  });
  console.log('✅ Utilisateur test créé:', user.email);

  // Créer des catégories
  const categories = [
    { name: 'Électronique', slug: 'electronique', description: 'Téléphones, ordinateurs, accessoires' },
    { name: 'Mode Homme', slug: 'mode-homme', description: 'Vêtements et accessoires pour hommes' },
    { name: 'Mode Femme', slug: 'mode-femme', description: 'Vêtements et accessoires pour femmes' },
    { name: 'Maison & Cuisine', slug: 'maison-cuisine', description: 'Équipements pour la maison' },
    { name: 'Beauté & Santé', slug: 'beaute-sante', description: 'Produits de beauté et soins' },
    { name: 'Sports', slug: 'sports', description: 'Équipements sportifs' }
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat
    });
  }
  console.log('✅ Catégories créées');

  // Récupérer la catégorie électronique
  const electroniqueCategory = await prisma.category.findUnique({
    where: { slug: 'electronique' }
  });

  // Créer des produits
  const products = [
    {
      name: 'iPhone 15 Pro Max',
      slug: 'iphone-15-pro-max',
      description: 'Le dernier iPhone avec puce A17 Pro, écran 6.7" Super Retina XDR',
      price: 850000,
      stock: 25,
      images: ['https://via.placeholder.com/400x400?text=iPhone+15'],
      categoryId: electroniqueCategory.id,
      isPopular: true
    },
    {
      name: 'Samsung Galaxy S24 Ultra',
      slug: 'samsung-galaxy-s24-ultra',
      description: 'Smartphone Samsung avec S Pen, écran 6.8" Dynamic AMOLED',
      price: 750000,
      stock: 30,
      images: ['https://via.placeholder.com/400x400?text=Galaxy+S24'],
      categoryId: electroniqueCategory.id,
      isPopular: true
    },
    {
      name: 'MacBook Pro M3',
      slug: 'macbook-pro-m3',
      description: 'Ordinateur portable Apple avec puce M3, 14" Liquid Retina XDR',
      price: 1200000,
      stock: 15,
      images: ['https://via.placeholder.com/400x400?text=MacBook+Pro'],
      categoryId: electroniqueCategory.id,
      isPopular: true
    },
    {
      name: 'AirPods Pro 2',
      slug: 'airpods-pro-2',
      description: 'Écouteurs sans fil Apple avec réduction de bruit active',
      price: 150000,
      stock: 50,
      images: ['https://via.placeholder.com/400x400?text=AirPods+Pro'],
      categoryId: electroniqueCategory.id,
      isPopular: false
    },
    {
      name: 'Sony PlayStation 5',
      slug: 'sony-playstation-5',
      description: 'Console de jeux nouvelle génération avec manette DualSense',
      price: 450000,
      stock: 20,
      images: ['https://via.placeholder.com/400x400?text=PS5'],
      categoryId: electroniqueCategory.id,
      isPopular: true
    }
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: product
    });
  }
  console.log('✅ Produits créés');

  // Créer des bannières
  const banners = [
    {
      title: 'Soldes d\'été',
      imageUrl: 'https://via.placeholder.com/1200x400?text=Soldes+Ete+-50%',
      link: '/shop',
      active: true
    },
    {
      title: 'Nouveaux smartphones',
      imageUrl: 'https://via.placeholder.com/1200x400?text=Nouveaux+Smartphones',
      link: '/shop?category=electronique',
      active: true
    }
  ];

  for (const banner of banners) {
    await prisma.banner.create({
      data: banner
    });
  }
  console.log('✅ Bannières créées');

  console.log('');
  console.log('🎉 Seeding terminé !');
  console.log('');
  console.log('📧 Comptes créés :');
  console.log('   Admin: admin@myshop.cm / admin123');
  console.log('   User:  user@myshop.cm / user123');
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
