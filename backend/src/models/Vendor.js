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
  // Business info
  businessType: {
    type: String,
    enum: ['individual', 'company'],
    default: 'individual'
  },
  idDocument: String, // URL du document d'identité
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
