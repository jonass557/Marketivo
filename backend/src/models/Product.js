const mongoose = require('mongoose');

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
  stock: {
    type: Number,
    default: 0
  },
  images: [String],
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  // Vendeur propriétaire du produit (null = produit admin/marketplace)
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
  // Statut du produit vendeur
  isApproved: {
    type: Boolean,
    default: true
  },
  // Score de visibilité (calculé à partir de l'abonnement vendeur)
  visibilityScore: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

productSchema.index({ vendor: 1 });
productSchema.index({ visibilityScore: -1 });

module.exports = mongoose.model('Product', productSchema);
