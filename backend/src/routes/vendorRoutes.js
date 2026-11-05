const express = require('express');
const router = express.Router();
const {
  registerVendor,
  getMyVendorProfile,
  updateVendorProfile,
  getVendorShop,
  getVendors,
  getTopVendors,
  getVendorStats,
  getVendorOrders,
  getAllVendorsAdmin,
  updateVendorStatus,
  updateVendorCommission,
  submitKYC,
  getKYCStatus,
  adminUpdateKYC
} = require('../controllers/vendorController');
const { protect, admin, vendor } = require('../middleware/auth');

// Routes publiques
router.post('/register', registerVendor);
router.get('/', getVendors);
router.get('/top', getTopVendors);
router.get('/shop/:slug', getVendorShop);

// Routes vendeur (protégées)
router.get('/me', protect, vendor, getMyVendorProfile);
router.put('/me', protect, vendor, updateVendorProfile);
router.get('/me/stats', protect, vendor, getVendorStats);
router.get('/me/orders', protect, vendor, getVendorOrders);
router.post('/kyc', protect, vendor, submitKYC);
router.get('/kyc', protect, vendor, getKYCStatus);

// Routes admin
router.get('/admin/all', protect, admin, getAllVendorsAdmin);
router.put('/admin/:id/status', protect, admin, updateVendorStatus);
router.put('/admin/:id/commission', protect, admin, updateVendorCommission);
router.put('/admin/:id/kyc', protect, admin, adminUpdateKYC);

module.exports = router;
