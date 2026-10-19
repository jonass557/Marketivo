const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: 'main'
  },
  // Boutique
  storeName: { type: String, default: 'MyShop' },
  storeLogo: String,
  storeDescription: String,
  storeEmail: String,
  storePhone: String,
  storeAddress: String,
  
  // Devise
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
  
  // Livraison
  enableShipping: { type: Boolean, default: true },
  freeShippingThreshold: { type: Number, default: 50000 },
  defaultShippingFee: { type: Number, default: 2500 },
  estimatedDelivery: { type: String, default: '24-48h' },
  
  // Paiement local
  enableMobileMoney: { type: Boolean, default: false },
  enableOrangeMoney: { type: Boolean, default: false },
  enableCashOnDelivery: { type: Boolean, default: false },
  
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
