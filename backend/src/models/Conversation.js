const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  // Référence au vendeur pour faciliter les requêtes
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  // Référence optionnelle au produit qui a initié la conversation
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  lastMessage: {
    text: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: Date
  },
  // Compteurs de messages non lus par participant
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  },
  // Statut de la conversation
  status: {
    type: String,
    enum: ['ACTIVE', 'ARCHIVED', 'BLOCKED'],
    default: 'ACTIVE'
  },
  // Modération admin
  isFlagged: {
    type: Boolean,
    default: false
  },
  flagReason: String
}, {
  timestamps: true
});

conversationSchema.index({ participants: 1 });
conversationSchema.index({ vendor: 1 });
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
