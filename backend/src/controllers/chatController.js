const asyncHandler = require('express-async-handler');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Vendor = require('../models/Vendor');

// @desc    Get or create conversation with a vendor
// @route   POST /api/chat/conversations
// @access  Private
const getOrCreateConversation = asyncHandler(async (req, res) => {
  const { vendorUserId, productId } = req.body;

  if (!vendorUserId) {
    res.status(400);
    throw new Error('ID du vendeur requis');
  }

  // Vérifier que le vendeur existe
  const vendorUser = await User.findById(vendorUserId);
  if (!vendorUser || vendorUser.role !== 'VENDOR') {
    res.status(404);
    throw new Error('Vendeur non trouvé');
  }

  const vendor = await Vendor.findOne({ user: vendorUserId });

  // Chercher une conversation existante entre ces deux utilisateurs
  let conversation = await Conversation.findOne({
    participants: { $all: [req.user._id, vendorUserId] },
    status: 'ACTIVE'
  })
    .populate('participants', 'fullName avatar role')
    .populate('vendor', 'shopName slug logo isOnline')
    .populate('product', 'name images price slug');

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [req.user._id, vendorUserId],
      vendor: vendor ? vendor._id : null,
      product: productId || null,
      unreadCount: new Map([[vendorUserId.toString(), 0], [req.user._id.toString(), 0]])
    });

    conversation = await Conversation.findById(conversation._id)
      .populate('participants', 'fullName avatar role')
      .populate('vendor', 'shopName slug logo isOnline')
      .populate('product', 'name images price slug');
  }

  res.json({ ...conversation.toObject(), id: conversation._id });
});

// @desc    Get my conversations
// @route   GET /api/chat/conversations
// @access  Private
const getMyConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    participants: req.user._id,
    status: { $ne: 'BLOCKED' }
  })
    .populate('participants', 'fullName avatar role')
    .populate('vendor', 'shopName slug logo isOnline')
    .populate('product', 'name images price slug')
    .sort({ updatedAt: -1 })
    .lean();

  const result = conversations.map(conv => ({
    ...conv,
    id: conv._id,
    unreadCount: conv.unreadCount ? (conv.unreadCount[req.user._id.toString()] || 0) : 0,
    otherParticipant: conv.participants.find(p => p._id.toString() !== req.user._id.toString())
  }));

  res.json(result);
});

// @desc    Get messages for a conversation
// @route   GET /api/chat/conversations/:id/messages
// @access  Private
const getMessages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) {
    res.status(404);
    throw new Error('Conversation non trouvée');
  }

  // Vérifier que l'utilisateur fait partie de la conversation
  const isParticipant = conversation.participants.some(
    p => p.toString() === req.user._id.toString()
  );
  const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

  if (!isParticipant && !isAdmin) {
    res.status(403);
    throw new Error('Accès non autorisé à cette conversation');
  }

  const messages = await Message.find({
    conversation: req.params.id,
    isDeleted: false
  })
    .populate('sender', 'fullName avatar role')
    .populate('productRef', 'name images price slug')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const total = await Message.countDocuments({
    conversation: req.params.id,
    isDeleted: false
  });

  // Marquer les messages comme lus
  await Message.updateMany(
    {
      conversation: req.params.id,
      sender: { $ne: req.user._id },
      readBy: { $ne: req.user._id }
    },
    { $addToSet: { readBy: req.user._id } }
  );

  // Réinitialiser le compteur de non-lus
  if (conversation.unreadCount) {
    conversation.unreadCount.set(req.user._id.toString(), 0);
    await conversation.save();
  }

  res.json({
    messages: messages.reverse().map(m => ({ ...m, id: m._id })),
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    total
  });
});

// @desc    Send a message
// @route   POST /api/chat/conversations/:id/messages
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
  const { text, type, attachment, productRef } = req.body;

  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) {
    res.status(404);
    throw new Error('Conversation non trouvée');
  }

  // Vérifier participation
  const isParticipant = conversation.participants.some(
    p => p.toString() === req.user._id.toString()
  );
  if (!isParticipant) {
    res.status(403);
    throw new Error('Accès non autorisé');
  }

  if (conversation.status === 'BLOCKED') {
    res.status(400);
    throw new Error('Cette conversation est bloquée');
  }

  const message = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    text: text || '',
    type: type || 'text',
    attachment: attachment || null,
    productRef: productRef || null,
    readBy: [req.user._id]
  });

  // Mettre à jour la conversation
  conversation.lastMessage = {
    text: text || (type === 'image' ? '📷 Image' : ''),
    sender: req.user._id,
    createdAt: new Date()
  };

  // Incrémenter le compteur de non-lus pour les autres participants
  conversation.participants.forEach(p => {
    const pid = p.toString();
    if (pid !== req.user._id.toString()) {
      const currentCount = conversation.unreadCount.get(pid) || 0;
      conversation.unreadCount.set(pid, currentCount + 1);
    }
  });

  await conversation.save();

  const populated = await Message.findById(message._id)
    .populate('sender', 'fullName avatar role')
    .populate('productRef', 'name images price slug')
    .lean();

  // Émettre via Socket.io
  const io = req.app.get('io');
  if (io) {
    conversation.participants.forEach(p => {
      if (p.toString() !== req.user._id.toString()) {
        io.to(`user_${p}`).emit('newMessage', {
          ...populated,
          id: populated._id,
          conversationId: conversation._id
        });
      }
    });
  }

  res.status(201).json({ ...populated, id: populated._id });
});

// @desc    Get unread count
// @route   GET /api/chat/unread
// @access  Private
const getUnreadCount = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    participants: req.user._id,
    status: 'ACTIVE'
  });

  let totalUnread = 0;
  conversations.forEach(conv => {
    if (conv.unreadCount) {
      totalUnread += conv.unreadCount.get(req.user._id.toString()) || 0;
    }
  });

  res.json({ unreadCount: totalUnread });
});

// ===== ADMIN ENDPOINTS =====

// @desc    Get all conversations (admin moderation)
// @route   GET /api/chat/admin/conversations
// @access  Private/Admin
const getAllConversationsAdmin = asyncHandler(async (req, res) => {
  const { flagged, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let query = {};
  if (flagged === 'true') query.isFlagged = true;

  const conversations = await Conversation.find(query)
    .populate('participants', 'fullName email role')
    .populate('vendor', 'shopName slug')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const total = await Conversation.countDocuments(query);

  res.json({
    conversations: conversations.map(c => ({ ...c, id: c._id })),
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    total
  });
});

// @desc    Block/unblock a conversation (admin)
// @route   PUT /api/chat/admin/conversations/:id/block
// @access  Private/Admin
const toggleBlockConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) {
    res.status(404);
    throw new Error('Conversation non trouvée');
  }

  conversation.status = conversation.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
  if (req.body.reason) {
    conversation.isFlagged = true;
    conversation.flagReason = req.body.reason;
  }
  await conversation.save();

  res.json({ ...conversation.toObject(), id: conversation._id });
});

// @desc    Delete a message (admin moderation)
// @route   DELETE /api/chat/admin/messages/:id
// @access  Private/Admin
const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);
  if (!message) {
    res.status(404);
    throw new Error('Message non trouvé');
  }

  message.isDeleted = true;
  message.deletedBy = req.user._id;
  message.text = '[Message supprimé par un administrateur]';
  await message.save();

  res.json({ message: 'Message supprimé' });
});

module.exports = {
  getOrCreateConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  getUnreadCount,
  getAllConversationsAdmin,
  toggleBlockConversation,
  deleteMessage
};
