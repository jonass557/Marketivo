const express = require('express');
const router = express.Router();
const {
  getOrCreateConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  getUnreadCount,
  getAllConversationsAdmin,
  toggleBlockConversation,
  deleteMessage
} = require('../controllers/chatController');
const { protect, admin } = require('../middleware/auth');

// Routes utilisateur (protégées)
router.post('/conversations', protect, getOrCreateConversation);
router.get('/conversations', protect, getMyConversations);
router.get('/conversations/:id/messages', protect, getMessages);
router.post('/conversations/:id/messages', protect, sendMessage);
router.get('/unread', protect, getUnreadCount);

// Routes admin
router.get('/admin/conversations', protect, admin, getAllConversationsAdmin);
router.put('/admin/conversations/:id/block', protect, admin, toggleBlockConversation);
router.delete('/admin/messages/:id', protect, admin, deleteMessage);

module.exports = router;
