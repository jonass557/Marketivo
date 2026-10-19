const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearNotifications
} = require('../controllers/notificationController');
const { protect, admin } = require('../middleware/auth');

router.get('/', protect, admin, getNotifications);
router.put('/read-all', protect, admin, markAllAsRead);
router.put('/:id/read', protect, admin, markAsRead);
router.delete('/clear', protect, admin, clearNotifications);
router.delete('/:id', protect, admin, deleteNotification);

module.exports = router;
