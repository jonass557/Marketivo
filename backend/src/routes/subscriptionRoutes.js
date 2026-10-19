const express = require('express');
const router = express.Router();
const {
  getActivePlans,
  getMySubscription,
  subscribeToPlan,
  getAllPlansAdmin,
  createPlan,
  updatePlan,
  togglePlanStatus,
  setRecommended,
  deletePlan,
  getAllSubscriptions,
  checkExpiredSubscriptions
} = require('../controllers/subscriptionController');
const { protect, admin, vendor } = require('../middleware/auth');

// Routes publiques
router.get('/plans', getActivePlans);

// Routes vendeur
router.get('/me', protect, vendor, getMySubscription);
router.post('/subscribe', protect, vendor, subscribeToPlan);

// Routes admin
router.get('/admin/plans', protect, admin, getAllPlansAdmin);
router.post('/admin/plans', protect, admin, createPlan);
router.put('/admin/plans/:id', protect, admin, updatePlan);
router.put('/admin/plans/:id/toggle', protect, admin, togglePlanStatus);
router.put('/admin/plans/:id/recommend', protect, admin, setRecommended);
router.delete('/admin/plans/:id', protect, admin, deletePlan);
router.get('/admin/subscriptions', protect, admin, getAllSubscriptions);
router.post('/admin/check-expiry', protect, admin, checkExpiredSubscriptions);

module.exports = router;
