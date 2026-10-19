const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Défini' : 'Non défini');

const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Banner = require('./models/Banner');
const Settings = require('./models/Settings');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connecté');
  } catch (error) {
    console.error('Erreur MongoDB:', error.message);
    process.exit(1);
  }
};

async function seed() {
  await connectDB();
  
  console.log('🌱 Seeding database...');

  // Créer un admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await User.findOneAndUpdate(
    { email: 'admin@myshop.cm' },
    {
      email: 'admin@myshop.cm',
      password: hashedPassword,
      fullName: 'Administrateur',
      role: 'ADMIN',
      phone: '+237 6XX XXX XXX'
    },
    { upsert: true, new: true }
  );
  console.log('✅ Admin créé:', admin.email);

  // Créer un utilisateur test
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await User.findOneAndUpdate(
    { email: 'user@myshop.cm' },
    {
      email: 'user@myshop.cm',
      password: userPassword,
      fullName: 'Client Test',
      role: 'USER',
      phone: '+237 6XX XXX XXX'
    },
    { upsert: true, new: true }
  );
  console.log('✅ Utilisateur test créé:', user.email);

  // Créer les catégories
  const categoriesData = [
    { name: 'Électronique', slug: 'electronique', description: 'Appareils électroniques', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400' },
    { name: 'Mode', slug: 'mode', description: 'Vêtements et accessoires', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400' },
    { name: 'Maison', slug: 'maison', description: 'Articles pour la maison', image: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400' },
    { name: 'Sports', slug: 'sports', description: 'Équipements sportifs', image: 'https://images.unsplash.com/photo-1461896836934- voices?w=400' },
    { name: 'Beauté', slug: 'beaute', description: 'Produits de beauté', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400' }
  ];

  const categories = [];
  for (const cat of categoriesData) {
    const category = await Category.findOneAndUpdate(
      { slug: cat.slug },
      cat,
      { upsert: true, new: true }
    );
    categories.push(category);
  }
  console.log('✅ Catégories créées');

  // Créer des produits
  const productsData = [
    {
      name: 'iPhone 15 Pro',
      slug: 'iphone-15-pro',
      description: 'Le dernier iPhone avec puce A17 Pro',
      price: 750000,
      oldPrice: 850000,
      brand: 'Apple',
      stock: 25,
      images: ['https://images.unsplash.com/photo-1696446702183-cbd13d78e1e7?w=400'],
      category: categories[0]._id,
      isPopular: true
    },
    {
      name: 'Samsung Galaxy S24',
      slug: 'samsung-galaxy-s24',
      description: 'Smartphone Samsung dernière génération',
      price: 550000,
      oldPrice: 650000,
      brand: 'Samsung',
      stock: 30,
      images: ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400'],
      category: categories[0]._id,
      isPopular: true
    },
    {
      name: 'Robe Élégante',
      slug: 'robe-elegante',
      description: 'Robe de soirée élégante',
      price: 35000,
      stock: 50,
      images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400'],
      category: categories[1]._id,
      isPopular: false
    },
    {
      name: 'Canapé Moderne',
      slug: 'canape-moderne',
      description: 'Canapé 3 places confortable',
      price: 250000,
      oldPrice: 300000,
      stock: 10,
      images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400'],
      category: categories[2]._id,
      isPopular: true
    },
    {
      name: 'Ballon de Football',
      slug: 'ballon-football',
      description: 'Ballon officiel taille 5',
      price: 15000,
      brand: 'Nike',
      stock: 100,
      images: ['https://images.unsplash.com/photo-1614632537190-23e4146777db?w=400'],
      category: categories[3]._id,
      isPopular: false
    }
  ];

  for (const prod of productsData) {
    await Product.findOneAndUpdate(
      { slug: prod.slug },
      prod,
      { upsert: true, new: true }
    );
  }
  console.log('✅ Produits créés');

  // Créer des bannières
  const bannersData = [
    {
      title: 'Nouvelle Collection',
      imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200',
      link: '/categories/mode',
      active: true
    },
    {
      title: 'Offres Spéciales',
      imageUrl: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1200',
      link: '/promotions',
      active: true
    }
  ];

  await Banner.deleteMany({});
  await Banner.insertMany(bannersData);
  console.log('✅ Bannières créées');

  // Créer les paramètres par défaut
  await Settings.findOneAndUpdate(
    { _id: 'main' },
    { _id: 'main', storeName: 'MyShop', currency: 'XAF', currencySymbol: 'FCFA' },
    { upsert: true }
  );
  console.log('✅ Paramètres créés');

  console.log('\n🎉 Seeding terminé !');
  console.log('\n📧 Comptes créés :');
  console.log('   Admin: admin@myshop.cm / admin123');
  console.log('   User:  user@myshop.cm / user123');

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch(err => {
  console.error('Erreur seed:', err);
  process.exit(1);
});
