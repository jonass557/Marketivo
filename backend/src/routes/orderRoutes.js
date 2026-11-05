const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getMyDigitalDownloads,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  deleteOrder
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/auth');

// Routes utilisateur
router.post('/', protect, createOrder);
router.get('/myorders', protect, getMyOrders);
router.get('/my-digital-downloads', protect, getMyDigitalDownloads);
router.get('/:id', protect, getOrderById);

// Routes admin
router.get('/', protect, admin, getAllOrders);
router.put('/:id/status', protect, admin, updateOrderStatus);
router.delete('/:id', protect, admin, deleteOrder);

module.exports = router;
