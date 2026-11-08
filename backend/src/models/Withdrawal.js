const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 500
  },
  currency: {
    type: String,
    default: 'XAF',
    uppercase: true
  },
  operator: {
    type: String,
    enum: ['ORANGE', 'MTN', 'WAVE', 'MOOV', 'AIRTEL', 'MOBICASH', 'BANK_TRANSFER'],
    required: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED'],
    default: 'PENDING',
    index: true
  },
  externalReference: {
    type: String,
    unique: true,
    sparse: true
  },
  providerReference: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
