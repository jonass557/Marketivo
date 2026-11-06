const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    default: null
  },
  name: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  commission: {
    type: Number,
    default: 0
  },
  commissionAmount: {
    type: Number,
    default: 0
  },
  // Type de produit (Physique vs Digital)
  productType: {
    type: String,
    enum: ['PHYSICAL', 'DIGITAL'],
    default: 'PHYSICAL'
  },
  digitalType: String,
  digitalFileUrl: String,
  digitalFileName: String,
  digitalAccessLink: String,
  digitalInstructions: String,

  // Protection anti-partage : liens signés temporaires et limitation
  downloadToken: String,
  downloadExpiresAt: Date,
  downloadCount: { type: Number, default: 0 },
  downloadLimit: { type: Number, default: 0 },

  // Variantes sélectionnées (taille, couleur) pour les produits physiques
  selectedVariant: {
    name: String,
    option: String
  },

  // Clé de licence pour produit externe
  licenseKey: String,

  // Prise de rendez-vous pour coaching/consultation
  coachingAppointment: {
    appointmentDate: String,
    timeSlot: String,
    meetingLink: String
  }
});

// Sous-commande découpée par vendeur (Cahier des charges 4.5)
const subOrderSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    default: null
  },
  vendorShopName: { type: String, default: '' },
  items: [orderItemSchema],
  subTotal: { type: Number, default: 0 },
  shippingCost: { type: Number, default: 0 },
  commissionAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'],
    default: 'PENDING'
  },
  escrowStatus: {
    type: String,
    enum: ['HELD', 'RELEASED', 'REFUNDED'],
    default: 'HELD'
  },
  deliveryCode: String
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
  },
  invoiceNumber: {
    type: String,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Peut être null si commande invité pour produit digital
  },
  // Commande invité sans compte obligatoire (Cahier des charges 4.5)
  guestCheckout: {
    isGuest: { type: Boolean, default: false },
    name: String,
    email: String,
    phone: String
  },
  items: [orderItemSchema],
  subOrders: [subOrderSchema], // Découpage par vendeur

  subTotal: {
    type: Number,
    default: 0
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  serviceFee: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  couponCode: {
    type: String,
    default: ''
  },
  totalAmount: {
    type: Number,
    required: true
  },

  // Types de commande
  isDigitalOnly: {
    type: Boolean,
    default: false
  },
  hasDigitalItems: {
    type: Boolean,
    default: false
  },

  // Statuts de livraison conformes au Cahier des Charges 4.7
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'],
    default: 'PENDING'
  },

  // Code unique de confirmation de livraison pour l'acheteur (Cahier des charges 4.7)
  deliveryCode: {
    type: String,
    default: ''
  },
  deliveryMethod: {
    type: String,
    enum: ['STANDARD', 'EXPRESS', 'PICKUP', 'VENDOR_DIRECT'],
    default: 'STANDARD'
  },

  // Système de Séquestre (Escrow - Cahier des charges 4.6)
  escrowStatus: {
    type: String,
    enum: ['HELD', 'RELEASED', 'REFUNDED'],
    default: 'HELD'
  },
  escrowReleaseDate: Date,

  // Paiement
  paymentMethod: {
    type: String,
    default: 'cod'
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED'],
    default: 'PENDING'
  },
  paymentId: String,
  paymentReference: String,
  providerReference: String,

  // Coordonnées de livraison
  shippingAddress: {
    type: String,
    required: true
  },
  city: String,
  phone: String,
  notes: String,

  // Remboursement (Cahier des charges 4.6)
  refund: {
    isRefunded: { type: Boolean, default: false },
    amount: { type: Number, default: 0 },
    reason: { type: String, default: '' },
    refundedAt: Date,
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },

  totalCommission: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

orderSchema.index({ orderNumber: 1 });
orderSchema.index({ 'items.vendor': 1 });
orderSchema.index({ deliveryCode: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);
