const express = require('express');
const router = express.Router();
const {
  validateCoupon,
  getCoupons,
  createCoupon,
  deleteCoupon
} = require('../controllers/couponController');
const { protect } = require('../middleware/auth');

// Route publique de validation d'un code promo au panier
router.post('/validate', validateCoupon);

// Routes protégées pour gestion (Admin & Vendeurs)
router.get('/', protect, getCoupons);
router.post('/', protect, createCoupon);
router.delete('/:id', protect, deleteCoupon);

module.exports = router;
