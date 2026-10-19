const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getChartData,
  searchAll
} = require('../controllers/statsController');
const { protect, admin } = require('../middleware/auth');

router.get('/', protect, admin, getDashboardStats);
router.get('/chart', protect, admin, getChartData);
router.get('/search', protect, admin, searchAll);

module.exports = router;
