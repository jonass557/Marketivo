const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  shopName: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    default: ''
  },
  logo: {
    type: String,
    default: ''
  },
  banner: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    required: true
  },
  whatsapp: String,
  email: String,
  address: String,
  city: String,
  country: {
    type: String,
    default: 'Cameroun'
  },
  // Extension internationale (Cahier des charges Section 15.1)
  isInternational: {
    type: Boolean,
    default: false
  },
  originCountry: {
    type: String,
    default: 'Cameroun'
  },
  shippingCountries: [{
    type: String,
    default: ['Cameroun']
  }],
  preferredCurrency: {
    type: String,
    default: 'XAF',
    uppercase: true
  },
  payoutMethod: {
    type: String,
    enum: ['MOBILE_MONEY', 'BANK_TRANSFER', 'WISE', 'PAYONEER'],
    default: 'MOBILE_MONEY'
  },
  warehouseAddress: {
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    country: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    contactPhone: { type: String, default: '' }
  },
  // Personnalisation boutique (Modèle Chariow)
  accentColor: {
    type: String,
    default: '#f97316'
  },
  tagline: {
    type: String,
    default: ''
  },
  theme: {
    type: String,
    default: 'modern'
  },
  // Business info
  businessType: {
    type: String,
    enum: ['individual', 'company'],
    default: 'individual'
  },
  idDocument: String, // URL du document d'identité
  // KYC Vendeur : CNI + Selfie, vérification obligatoire pour débloquer les retraits
  kycStatus: {
    type: String,
    enum: ['NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED'],
    default: 'NOT_SUBMITTED'
  },
  kycIdDocument: {
    type: String,
    default: ''
  },
  kycSelfie: {
    type: String,
    default: ''
  },
  kycSubmittedAt: Date,
  kycVerifiedAt: Date,
  kycRejectionReason: {
    type: String,
    default: ''
  },
  payoutsBlocked: {
    type: Boolean,
    default: true // Par défaut bloqué tant que KYC non vérifié
  },
  // Status
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED'],
    default: 'PENDING'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Ratings
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  totalSales: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  // Stats hybrides (Chariow + Jumia)
  digitalSales: {
    type: Number,
    default: 0
  },
  physicalSales: {
    type: Number,
    default: 0
  },
  digitalRevenue: {
    type: Number,
    default: 0
  },
  physicalRevenue: {
    type: Number,
    default: 0
  },
  // Badges
  badges: [{
    type: String,
    enum: ['NEW', 'TRUSTED', 'TOP_SELLER', 'VERIFIED', 'PREMIUM']
  }],
  // Commission override (if set, overrides subscription commission)
  commissionOverride: {
    type: Number,
    default: null
  },
  // Social media links
  socialLinks: {
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' },
    twitter: { type: String, default: '' },
    tiktok: { type: String, default: '' },
    youtube: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    website: { type: String, default: '' }
  },
  // Accepted payment methods by vendor
  acceptedPayments: [{
    type: String,
    enum: ['momo_mtn', 'momo_orange', 'cod', 'bank_transfer'],
    default: ['cod']
  }],
  // Online status
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  // Visibility score (calculated from subscription + rating + sales)
  visibilityScore: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for search and visibility
vendorSchema.index({ status: 1, visibilityScore: -1 });
vendorSchema.index({ shopName: 'text', description: 'text' });

module.exports = mongoose.model('Vendor', vendorSchema);
