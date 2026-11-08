const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  reason: {
    type: String,
    enum: [
      'ITEM_NOT_RECEIVED',
      'ITEM_DEFECTIVE',
      'NOT_AS_DESCRIBED',
      'DIGITAL_ACCESS_ISSUE',
      'WRONG_ITEM',
      'SELLER_UNRESPONSIVE',
      'OTHER'
    ],
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  attachments: [{
    type: String
  }],
  status: {
    type: String,
    enum: [
      'OPEN',
      'UNDER_REVIEW',
      'RESOLVED_BUYER_REFUNDED',
      'RESOLVED_VENDOR_PAID',
      'REJECTED',
      'CANCELLED'
    ],
    default: 'OPEN',
    index: true
  },
  resolution: {
    decision: {
      type: String,
      enum: ['REFUND_FULL', 'REFUND_PARTIAL', 'RELEASE_FUNDS', 'DISMISSED'],
      default: null
    },
    refundAmount: {
      type: Number,
      default: 0
    },
    note: {
      type: String,
      default: ''
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Dispute', disputeSchema);
