const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');

// @desc    Get all notifications
// @route   GET /api/notifications
// @access  Private/Admin
const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const unreadCount = await Notification.countDocuments({ read: false });

  res.json({ 
    notifications: notifications.map(n => ({ ...n, id: n._id })), 
    unreadCount 
  });
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private/Admin
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findByIdAndUpdate(
    req.params.id,
    { read: true },
    { new: true }
  );

  res.json({ ...notification.toObject(), id: notification._id });
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private/Admin
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ read: false }, { read: true });

  res.json({ message: 'Toutes les notifications ont été lues' });
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private/Admin
const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findByIdAndDelete(req.params.id);

  res.json({ message: 'Notification supprimée' });
});

// @desc    Delete all read notifications
// @route   DELETE /api/notifications/clear
// @access  Private/Admin
const clearNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ read: true });

  res.json({ message: 'Notifications supprimées' });
});

// Helper function to create notification (used by other controllers)
const createNotification = async (type, title, message, orderId = null, userId = null) => {
  try {
    const notification = await Notification.create({ type, title, message, orderId, userId });
    return notification;
  } catch (error) {
    console.error('Erreur création notification:', error);
    return null;
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearNotifications,
  createNotification
};
