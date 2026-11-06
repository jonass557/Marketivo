const express = require('express');
const router = express.Router();
const {
  getSearchSuggestions,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  moderateProduct,
  deleteProduct,
  togglePopular,
  importProducts
} = require('../controllers/productController');
const { protect, admin, vendorOrAdmin } = require('../middleware/auth');

// Autocomplétion et suggestions instantanées (Cahier des charges 4.4)
router.get('/search/suggestions', getSearchSuggestions);

// Routes publiques
router.get('/', getProducts);
router.get('/:id', getProductById);

// Routes protégées (Vendeur ou Admin)
router.post('/', protect, vendorOrAdmin, createProduct);
router.put('/:id', protect, vendorOrAdmin, updateProduct);
router.delete('/:id', protect, vendorOrAdmin, deleteProduct);

// Modération des produits par l'administrateur (Cahier des charges 4.3)
router.put('/admin/:id/moderate', protect, admin, moderateProduct);

// Routes admin uniquement
router.post('/import', protect, admin, importProducts);
router.put('/:id/popular', protect, admin, togglePopular);

module.exports = router;
