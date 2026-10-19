const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  getSettings,
  updateSettings,
  getCurrencies,
  getThemes
} = require('../controllers/settingsController');

// Routes publiques
router.get('/', getSettings);
router.get('/currencies', getCurrencies);
router.get('/themes', getThemes);

// Routes admin
router.put('/', protect, admin, updateSettings);

module.exports = router;
