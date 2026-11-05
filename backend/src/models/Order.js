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
  quantity: {
    type: Number,
    required: true
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
  digitalInstructions: String
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  // Commande hybride : physique ou digitale
  isDigitalOnly: {
    type: Boolean,
    default: false
  },
  hasDigitalItems: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING'
  },
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
  shippingAddress: {
    type: String,
    required: true
  },
  city: String,
  phone: String,
  notes: String,
  // Commission totale de la marketplace sur cette commande
  totalCommission: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

orderSchema.index({ 'items.vendor': 1 });

module.exports = mongoose.model('Order', orderSchema);
