const mongoose = require('mongoose');

const userSubscriptionSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true
  },
  // Snapshot des infos du plan au moment de la souscription
  planSnapshot: {
    name: String,
    price: Number,
    commission: Number,
    maxProducts: Number,
    visibilityLevel: Number,
    chatPriority: Boolean,
    supportPremium: Boolean
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED'],
    default: 'ACTIVE'
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  // Paiement
  paymentMethod: {
    type: String,
    enum: ['mobile_money', 'orange_money', 'card', 'free'],
    default: 'free'
  },
  paymentReference: String,
  amountPaid: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'XAF'
  },
  // Renouvellement
  autoRenew: {
    type: Boolean,
    default: false
  },
  renewalReminded: {
    type: Boolean,
    default: false
  },
  // Historique
  renewalCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

userSubscriptionSchema.index({ vendor: 1, status: 1 });
userSubscriptionSchema.index({ endDate: 1, status: 1 });

module.exports = mongoose.model('UserSubscription', userSubscriptionSchema);
