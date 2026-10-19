const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    default: ''
  },
  // Type de message
  type: {
    type: String,
    enum: ['text', 'image', 'product_link', 'system'],
    default: 'text'
  },
  // Pièce jointe (image, etc.)
  attachment: {
    url: String,
    type: String
  },
  // Référence produit (pour partager un produit dans le chat)
  productRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  // Lecture
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Modération
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

messageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
