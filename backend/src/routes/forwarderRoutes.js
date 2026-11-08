const express = require('express');
const router = express.Router();
const {
  getForwarders,
  getForwarderById,
  registerForwarder,
  updateForwarderProfile,
  adminGetForwarders,
  adminUpdateForwarderStatus
} = require('../controllers/forwarderController');
const { protect, admin, forwarder } = require('../middleware/auth');

// Public
router.get('/', getForwarders);
router.get('/:id', getForwarderById);

// Protected (User / Forwarder)
router.post('/register', protect, registerForwarder);
router.put('/my-profile', protect, forwarder, updateForwarderProfile);

// Admin
router.get('/admin/all', protect, admin, adminGetForwarders);
router.put('/admin/:id/status', protect, admin, adminUpdateForwarderStatus);

module.exports = router;
