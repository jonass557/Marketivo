const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
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
  price: {
    type: Number,
    required: true,
    default: 0
  },
  currency: {
    type: String,
    default: 'XAF'
  },
  // Durée en jours (30 = mensuel, 90 = trimestriel)
  duration: {
    type: Number,
    required: true,
    default: 30
  },
  // Commission en pourcentage
  commission: {
    type: Number,
    required: true,
    default: 10
  },
  // Limite de produits (0 = illimité)
  maxProducts: {
    type: Number,
    default: 20
  },
  // Niveau de visibilité (1-4, plus c'est haut, plus le vendeur est visible)
  visibilityLevel: {
    type: Number,
    default: 1,
    min: 1,
    max: 4
  },
  // Avantages sous forme de tableau
  advantages: [{
    type: String
  }],
  // Priorité d'affichage (pour l'ordre dans la page pricing)
  priority: {
    type: Number,
    default: 0
  },
  // Chat features
  chatIncluded: {
    type: Boolean,
    default: true
  },
  chatPriority: {
    type: Boolean,
    default: false
  },
  supportPremium: {
    type: Boolean,
    default: false
  },
  // Statut
  isActive: {
    type: Boolean,
    default: true
  },
  // Est-ce le plan gratuit par défaut ?
  isFree: {
    type: Boolean,
    default: false
  },
  // Plan recommandé (mis en avant dans l'UI)
  isRecommended: {
    type: Boolean,
    default: false
  },
  // Couleur / icône pour l'affichage
  color: {
    type: String,
    default: '#6b7280'
  },
  icon: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

subscriptionPlanSchema.index({ isActive: 1, priority: 1 });

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
