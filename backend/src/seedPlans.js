const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const SubscriptionPlan = require('./models/SubscriptionPlan');
const Partner = require('./models/Partner');

dotenv.config();

const defaultPlans = [
  {
    name: 'Standard',
    slug: 'standard',
    description: 'Démarrez gratuitement avec jusqu\'à 8 produits',
    price: 0,
    currency: 'XAF',
    duration: 36500,
    commission: 10,
    maxProducts: 8,
    visibilityLevel: 1,
    advantages: [
      '8 produits maximum',
      'Commission 10% par vente',
      'Boutique en ligne personnalisée',
      'Chat inclus avec les clients',
      'Support communautaire',
      'Tableau de bord vendeur'
    ],
    priority: 0,
    chatIncluded: true,
    chatPriority: false,
    supportPremium: false,
    isActive: true,
    isFree: true,
    isRecommended: false,
    color: '#6b7280',
    icon: 'gift'
  },
  {
    name: 'Premium',
    slug: 'premium',
    description: 'Pour les vendeurs qui veulent développer leur activité',
    price: 5000,
    currency: 'XAF',
    duration: 30,
    commission: 5,
    maxProducts: 100,
    visibilityLevel: 2,
    advantages: [
      '100 produits maximum',
      'Commission réduite à 5%',
      'Visibilité améliorée dans les résultats',
      'Chat prioritaire avec les clients',
      'Badge Vendeur Premium',
      'Statistiques de ventes avancées',
      'Support par email prioritaire'
    ],
    priority: 1,
    chatIncluded: true,
    chatPriority: true,
    supportPremium: false,
    isActive: true,
    isFree: false,
    isRecommended: true,
    color: '#f97316',
    icon: 'flame'
  },
  {
    name: 'Entreprise',
    slug: 'entreprise',
    description: 'La solution complète pour les grandes entreprises',
    price: 15000,
    currency: 'XAF',
    duration: 30,
    commission: 0,
    maxProducts: 0,
    visibilityLevel: 4,
    advantages: [
      'Produits illimités',
      'Zéro commission sur les ventes',
      'Visibilité maximale (top des résultats)',
      'Chat prioritaire + support premium',
      'Badge Entreprise Certifiée',
      'Statistiques complètes & exports',
      'Position prioritaire sur la page d\'accueil',
      'Support dédié WhatsApp 24/7'
    ],
    priority: 2,
    chatIncluded: true,
    chatPriority: true,
    supportPremium: true,
    isActive: true,
    isFree: false,
    isRecommended: false,
    color: '#8b5cf6',
    icon: 'trophy'
  }
];

const defaultPartners = [
  { name: 'MTN', logo: 'https://logo.clearbit.com/mtn.com', website: 'https://www.mtn.cm', isActive: true, order: 1 },
  { name: 'Orange', logo: 'https://logo.clearbit.com/orange.com', website: 'https://www.orange.cm', isActive: true, order: 2 },
  { name: 'DHL', logo: 'https://logo.clearbit.com/dhl.com', website: 'https://www.dhl.com', isActive: true, order: 3 },
  { name: 'Visa', logo: 'https://logo.clearbit.com/visa.com', website: 'https://www.visa.com', isActive: true, order: 4 },
  { name: 'Mastercard', logo: 'https://logo.clearbit.com/mastercard.com', website: 'https://www.mastercard.com', isActive: true, order: 5 },
  { name: 'PayPal', logo: 'https://logo.clearbit.com/paypal.com', website: 'https://www.paypal.com', isActive: true, order: 6 },
  { name: 'UBA', logo: 'https://logo.clearbit.com/ubagroup.com', website: 'https://www.ubagroup.com', isActive: true, order: 7 },
  { name: 'Jumia', logo: 'https://logo.clearbit.com/jumia.com', website: 'https://www.jumia.cm', isActive: true, order: 8 },
];

const seedPlans = async () => {
  try {
    await connectDB();
    console.log('Connexion à la base de données...');

    // ---- Plans ----
    const existingPlans = await SubscriptionPlan.countDocuments();
    if (existingPlans > 0) {
      console.log(`${existingPlans} plans existent déjà. Suppression...`);
      await SubscriptionPlan.deleteMany({});
    }
    const createdPlans = await SubscriptionPlan.insertMany(defaultPlans);
    console.log(`✅ ${createdPlans.length} plans créés :`);
    createdPlans.forEach(plan => {
      console.log(`  - ${plan.name} : ${plan.price} ${plan.currency}/mois (Commission: ${plan.commission}%)`);
    });

    // ---- Partenaires ----
    const existingPartners = await Partner.countDocuments();
    if (existingPartners > 0) {
      console.log(`${existingPartners} partenaires existent déjà. Suppression...`);
      await Partner.deleteMany({});
    }
    const createdPartners = await Partner.insertMany(defaultPartners);
    console.log(`✅ ${createdPartners.length} partenaires créés :`);
    createdPartners.forEach(p => {
      console.log(`  - ${p.name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Erreur lors du seeding:', error);
    process.exit(1);
  }
};

seedPlans();
