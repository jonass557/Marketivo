const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  togglePopular,
  importProducts
} = require('../controllers/productController');
const { protect, admin, vendorOrAdmin } = require('../middleware/auth');

// Routes publiques
router.get('/', getProducts);
router.get('/:id', getProductById);

// Routes protégées (Vendeur ou Admin)
router.post('/', protect, vendorOrAdmin, createProduct);
router.put('/:id', protect, vendorOrAdmin, updateProduct);
router.delete('/:id', protect, vendorOrAdmin, deleteProduct);

// Routes admin uniquement
router.post('/import', protect, admin, importProducts);
router.put('/:id/popular', protect, admin, togglePopular);

module.exports = router;
