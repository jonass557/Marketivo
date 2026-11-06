const express = require('express');
const router = express.Router();
const {
  createOrder,
  confirmDelivery,
  adminRefundOrder,
  getOrderInvoice,
  getMyOrders,
  getMyDigitalDownloads,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  deleteOrder
} = require('../controllers/orderController');
const { protect, optionalProtect, admin } = require('../middleware/auth');

// Création de commande (supporte client connecté ou mode invité pour le digital)
router.post('/', optionalProtect, createOrder);

// Espace client
router.get('/myorders', protect, getMyOrders);
router.get('/my-digital-downloads', protect, getMyDigitalDownloads);

// Facture / reçu de commande
router.get('/:id/invoice', optionalProtect, getOrderInvoice);

// Confirmation de livraison par code unique (acheteur ou livreur/vendeur)
router.post('/:id/confirm-delivery', optionalProtect, confirmDelivery);

// Détail d'une commande
router.get('/:id', protect, getOrderById);

// Routes admin
router.get('/', protect, admin, getAllOrders);
router.put('/:id/status', protect, admin, updateOrderStatus);
router.post('/admin/:id/refund', protect, admin, adminRefundOrder);
router.delete('/:id', protect, admin, deleteOrder);

module.exports = router;
