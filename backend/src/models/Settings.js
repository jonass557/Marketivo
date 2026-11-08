const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: 'main'
  },
  // Boutique
  storeName: { type: String, default: 'Marketivo' },
  storeLogo: String,
  storeDescription: String,
  storeEmail: String,
  storePhone: String,
  storeAddress: String,

  // Devise principale (FCFA XAF / XOF)
  currency: { type: String, default: 'XAF' },
  currencySymbol: { type: String, default: 'FCFA' },
  currencyPosition: { type: String, default: 'after' },

  // Notifications Admin
  adminEmail: String,
  adminWhatsApp: String,
  orderNotifications: { type: Boolean, default: true },
  stockAlerts: { type: Boolean, default: true },

  // Thème
  primaryColor: { type: String, default: '#f97316' },
  secondaryColor: { type: String, default: '#1f2937' },
  accentColor: { type: String, default: '#10b981' },

  // Modération des produits & Sécurité (Cahier des charges 4.3)
  productModeration: { type: Boolean, default: false },
  prohibitedProducts: {
    type: [String],
    default: [
      'Armes à feu, munitions et explosifs',
      'Produits pharmaceutiques et médicaments non autorisés',
      'Contrefaçons, répliques et copies illégales',
      'Drogues, stupéfiants et substances illicites',
      'Faux documents d’identité, diplômes frauduleux',
      'Contenus violents, haineux ou pornographiques',
      'Logiciels malveillants, virus et outils de piratage'
    ]
  },

  // Système de Séquestre / Escrow (Cahier des charges 4.6)
  escrowHoldDays: { type: Number, default: 3 }, // Délai de libération des fonds vendeur

  // Frais de service (Cahier des charges 4.5)
  serviceFeeFixed: { type: Number, default: 0 },
  serviceFeePercentage: { type: Number, default: 0 },

  // Livraison & Zones configurables (Cahier des charges 4.7)
  enableShipping: { type: Boolean, default: true },
  freeShippingThreshold: { type: Number, default: 50000 },
  defaultShippingFee: { type: Number, default: 2000 },
  estimatedDelivery: { type: String, default: '24-48h' },
  deliveryZones: [{
    city: { type: String, required: true },
    quarter: { type: String, default: 'Tous les quartiers' },
    fee: { type: Number, required: true },
    estimatedDays: { type: String, default: '24-48h' }
  }],

  // Paiement local
  enableMobileMoney: { type: Boolean, default: true },
  enableOrangeMoney: { type: Boolean, default: true },
  enableCashOnDelivery: { type: Boolean, default: true },

  // Stripe
  enableStripe: { type: Boolean, default: false },
  stripePublicKey: String,
  stripeSecretKey: String,
  stripeWebhookSecret: String,

  // PayPal
  enablePaypal: { type: Boolean, default: false },
  paypalClientId: String,
  paypalClientSecret: String,
  paypalMode: { type: String, default: 'sandbox' },

  // CinetPay
  enableCinetpay: { type: Boolean, default: false },
  cinetpayApiKey: String,
  cinetpaySiteId: String,
  cinetpaySecretKey: String,
  cinetpayMode: { type: String, default: 'test' },

  // iKeepay Mobile Money (H2H - Live)
  enableIkeepay: { type: Boolean, default: true },
  ikeepaySecretKey: String,

  // Extension internationale (Cahier des charges Section 15)
  internationalEnabled: { type: Boolean, default: true },
  allowedOriginCountries: {
    type: [String],
    default: ['Cameroun', 'Chine', 'Nigeria', 'Côte d\'Ivoire', 'France', 'Turquie', 'Émirats Arabes Unis', 'USA', 'Ghana', 'Sénégal']
  },
  restrictedCountries: {
    type: [String],
    default: []
  },
  // Taux de change (par rapport à 1 unité de devise vers XAF)
  exchangeRates: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      XAF: 1,
      XOF: 1,
      CNY: 85.5,   // 1 Yuan ≈ 85.5 FCFA
      NGN: 0.42,   // 1 Naira ≈ 0.42 FCFA
      USD: 618.0,  // 1 USD ≈ 618 FCFA
      EUR: 655.957 // 1 EUR = 655.957 FCFA
    }
  },

  // Module Transitaires (Cahier des charges Section 16)
  forwarderCommissionPercentage: { type: Number, default: 5 }, // 5% commission plateforme sur le transit
  forwardersEnabled: { type: Boolean, default: true },

  // SEO
  metaTitle: String,
  metaDescription: String,

  // Footer
  footerEmail: String,
  footerPhone: String,
  footerAddress: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);
