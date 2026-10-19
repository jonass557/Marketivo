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
    enum: ['USER', 'VENDOR', 'ADMIN', 'SUPER_ADMIN'],
    default: 'USER'
  },
  address: String,
  phone: String,
  avatar: String,
  // Référence vers le profil vendeur (si role === VENDOR)
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
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
