const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  getReviews,
  getProductReviews,
  createReview,
  deleteReview,
  getReviewStats
} = require('../controllers/reviewController');

// Public routes
router.get('/product/:productId', getProductReviews);

// Protected routes (logged in users)
router.post('/', protect, createReview);

// Admin routes
router.get('/', protect, admin, getReviews);
router.get('/stats', protect, admin, getReviewStats);
router.delete('/:id', protect, admin, deleteReview);

module.exports = router;
