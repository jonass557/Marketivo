const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  getBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBanner
} = require('../controllers/bannerController');

// Routes publiques
router.get('/', getBanners);
router.get('/:id', getBannerById);

// Routes admin
router.post('/', protect, admin, createBanner);
router.put('/:id', protect, admin, updateBanner);
router.put('/:id/toggle', protect, admin, toggleBanner);
router.delete('/:id', protect, admin, deleteBanner);

module.exports = router;
