const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['USER', 'VENDOR', 'FORWARDER', 'DELIVERY_AGENT', 'ADMIN', 'SUPER_ADMIN'],
    default: 'USER'
  },
  address: String,
  phone: String,
  avatar: String,
  // Pays de résidence (Section 15 International)
  country: {
    type: String,
    default: 'Cameroun'
  },
  // Référence vers le profil vendeur (si role === VENDOR)
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  // Référence vers le profil transitaire (si role === FORWARDER - Section 16)
  forwarder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Forwarder'
  },
  // Favoris
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  resetToken: String,
  resetTokenExpiry: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
