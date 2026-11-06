const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  image: String,
  // Type de catégorie : Physique, Digital ou Mixte
  type: {
    type: String,
    enum: ['ALL', 'PHYSICAL', 'DIGITAL'],
    default: 'ALL'
  },
  // Sous-catégories gérées par l'admin
  subcategories: [{
    type: String,
    trim: true
  }],
  // Catégorie parente optionnelle pour hiérarchie
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Category', categorySchema);
