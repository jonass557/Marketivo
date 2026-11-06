const mongoose = require('mongoose');

// Schéma des leçons pour les formations / cours en ligne
const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: {
    type: String,
    enum: ['VIDEO', 'TEXT', 'PDF'],
    default: 'VIDEO'
  },
  contentUrl: { type: String, default: '' },
  textContent: { type: String, default: '' },
  duration: { type: String, default: '' } // ex: "15 min"
});

// Schéma des modules d'une formation
const courseModuleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  lessons: [lessonSchema]
});

// Schéma des variantes pour produits physiques (tailles, couleurs, etc.)
const variantSchema = new mongoose.Schema({
  name: { type: String, required: true }, // ex: "Taille", "Couleur"
  options: [{ type: String, required: true }], // ex: ["S", "M", "L", "XL"]
  price: Number, // Prix spécifique si différent du prix de base
  stock: Number,
  sku: String
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  oldPrice: Number,
  brand: String,
  size: String,
  sku: {
    type: String,
    default: ''
  },
  stock: {
    type: Number,
    default: 0
  },
  images: [String], // Jusqu'à 8 photos
  videoUrl: {
    type: String,
    default: '' // Lien vidéo démo (YouTube, Vimeo, MP4 direct)
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategory: {
    type: String,
    default: ''
  },
  // Type de produit (Cahier des charges 4.3)
  productType: {
    type: String,
    enum: ['PHYSICAL', 'DIGITAL'],
    default: 'PHYSICAL'
  },
  // Sous-catégorisation digitale (Chariow : Ebook, Cours, Service/Coaching, Externe, etc.)
  digitalType: {
    type: String,
    enum: ['EBOOK', 'COURSE', 'TEMPLATE', 'SOFTWARE', 'COACHING', 'FILE', 'EXTERNAL', 'OTHER'],
    default: 'EBOOK'
  },

  // 1. Spécifique Produit Physique : Poids, Dimensions, Variantes
  weight: {
    type: Number,
    default: 0 // en kg
  },
  dimensions: {
    length: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 }
  },
  variants: [variantSchema],

  // 2. Spécifique Produit Digital Téléchargeable
  digitalFileUrl: {
    type: String,
    default: ''
  },
  digitalFileName: {
    type: String,
    default: ''
  },
  digitalFileSize: {
    type: String,
    default: ''
  },
  downloadLimit: {
    type: Number,
    default: 0 // 0 = illimité
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  digitalAccessLink: {
    type: String,
    default: ''
  },
  digitalInstructions: {
    type: String,
    default: ''
  },

  // 3. Spécifique Formation / Cours en ligne
  courseModules: [courseModuleSchema],

  // 4. Spécifique Service / Coaching / Consultation
  coachingDetails: {
    durationMinutes: { type: Number, default: 60 },
    meetingPlatform: {
      type: String,
      enum: ['GOOGLE_MEET', 'ZOOM', 'PHYSICAL', 'WHATSAPP', 'OTHER'],
      default: 'GOOGLE_MEET'
    },
    meetingLink: { type: String, default: '' },
    locationAddress: { type: String, default: '' },
    availabilitySchedule: [{
      dayOfWeek: String, // ex: 'Lundi', 'Mardi'
      startTime: String, // ex: '09:00'
      endTime: String    // ex: '18:00'
    }]
  },

  // 5. Spécifique Produit Externe (hébergé ailleurs, clé de licence ou lien)
  externalProduct: {
    accessType: {
      type: String,
      enum: ['LINK', 'LICENSE_KEY', 'CODE'],
      default: 'LINK'
    },
    accessUrl: { type: String, default: '' },
    licenseKeys: [String] // Clés de licence distribuées à l'achat
  },

  // Vendeur propriétaire
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    default: null
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  isAffiliate: {
    type: Boolean,
    default: false
  },
  affiliateUrl: String,

  // Modération des produits
  moderationStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'APPROVED'
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  visibilityScore: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

productSchema.index({ vendor: 1 });
productSchema.index({ visibilityScore: -1 });
productSchema.index({ productType: 1 });
productSchema.index({ digitalType: 1 });
productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
