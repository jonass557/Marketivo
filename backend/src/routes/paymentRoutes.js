const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  // Stripe
  createStripePaymentIntent,
  confirmStripePayment,
  stripeWebhook,
  // PayPal
  createPayPalOrder,
  capturePayPalPayment,
  // CinetPay
  initializeCinetPayPayment,
  cinetPayNotify,
  checkCinetPayStatus,
  // General
  getPaymentMethods
} = require('../controllers/paymentController');

// Public routes
router.get('/methods', getPaymentMethods);

// Stripe routes
router.post('/stripe/create-intent', protect, createStripePaymentIntent);
router.post('/stripe/confirm', protect, confirmStripePayment);
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// PayPal routes
router.post('/paypal/create-order', protect, createPayPalOrder);
router.post('/paypal/capture', protect, capturePayPalPayment);

// CinetPay routes
router.post('/cinetpay/initialize', protect, initializeCinetPayPayment);
router.post('/cinetpay/notify', cinetPayNotify); // Webhook public
router.post('/cinetpay/check', protect, checkCinetPayStatus);

module.exports = router;
