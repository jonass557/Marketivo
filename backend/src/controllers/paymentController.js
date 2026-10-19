const asyncHandler = require('express-async-handler');
const Settings = require('../models/Settings');
const Order = require('../models/Order');
const axios = require('axios');

// ============================================
// STRIPE INTEGRATION
// https://stripe.com/docs/api
// ============================================

// @desc    Create Stripe payment intent
// @route   POST /api/payments/stripe/create-intent
// @access  Private
const createStripePaymentIntent = asyncHandler(async (req, res) => {
  const { amount, orderId } = req.body;

  const settings = await Settings.findOne({ _id: 'main' });
  
  if (!settings?.enableStripe || !settings?.stripeSecretKey) {
    res.status(400);
    throw new Error('Stripe n\'est pas configuré');
  }

  const stripe = require('stripe')(settings.stripeSecretKey);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount), // Stripe utilise les centimes
    currency: settings.currency.toLowerCase(),
    metadata: {
      orderId: orderId,
      userId: req.user.id
    }
  });

  res.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id
  });
});

// @desc    Confirm Stripe payment
// @route   POST /api/payments/stripe/confirm
// @access  Private
const confirmStripePayment = asyncHandler(async (req, res) => {
  const { paymentIntentId, orderId } = req.body;

  const settings = await Settings.findOne({ _id: 'main' });
  const stripe = require('stripe')(settings.stripeSecretKey);

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status === 'succeeded') {
    // Mettre à jour la commande
    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: 'PAID',
      paymentMethod: 'STRIPE',
      paymentId: paymentIntentId
    });

    res.json({ success: true, message: 'Paiement confirmé' });
  } else {
    res.status(400);
    throw new Error('Le paiement n\'a pas été complété');
  }
});

// @desc    Stripe webhook handler
// @route   POST /api/payments/stripe/webhook
// @access  Public
const stripeWebhook = asyncHandler(async (req, res) => {
  const settings = await Settings.findOne({ _id: 'main' });
  const stripe = require('stripe')(settings.stripeSecretKey);
  
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, settings.stripeWebhookSecret);
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata.orderId;

    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: 'PAID',
      paymentMethod: 'STRIPE',
      paymentId: paymentIntent.id
    });
  }

  res.json({ received: true });
});

// ============================================
// PAYPAL INTEGRATION
// https://developer.paypal.com/docs/api/orders/v2/
// ============================================

const getPayPalAccessToken = async (settings) => {
  const auth = Buffer.from(`${settings.paypalClientId}:${settings.paypalClientSecret}`).toString('base64');
  const baseUrl = settings.paypalMode === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';

  const response = await axios.post(
    `${baseUrl}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  return response.data.access_token;
};

// @desc    Create PayPal order
// @route   POST /api/payments/paypal/create-order
// @access  Private
const createPayPalOrder = asyncHandler(async (req, res) => {
  const { amount, orderId } = req.body;

  const settings = await Settings.findOne({ _id: 'main' });
  
  if (!settings?.enablePaypal || !settings?.paypalClientId) {
    res.status(400);
    throw new Error('PayPal n\'est pas configuré');
  }

  const accessToken = await getPayPalAccessToken(settings);
  const baseUrl = settings.paypalMode === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';

  // Convertir en devise supportée par PayPal si nécessaire
  let currency = settings.currency;
  let finalAmount = amount;
  
  // PayPal ne supporte pas XAF directement, conversion en EUR
  if (currency === 'XAF' || currency === 'XOF') {
    currency = 'EUR';
    finalAmount = (amount / 655.957).toFixed(2); // Taux fixe FCFA/EUR
  }

  const response = await axios.post(
    `${baseUrl}/v2/checkout/orders`,
    {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: orderId,
        amount: {
          currency_code: currency,
          value: finalAmount.toString()
        }
      }],
      application_context: {
        return_url: `${process.env.FRONTEND_URL}/checkout/success`,
        cancel_url: `${process.env.FRONTEND_URL}/checkout/cancel`
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  res.json({
    orderId: response.data.id,
    approvalUrl: response.data.links.find(l => l.rel === 'approve')?.href
  });
});

// @desc    Capture PayPal payment
// @route   POST /api/payments/paypal/capture
// @access  Private
const capturePayPalPayment = asyncHandler(async (req, res) => {
  const { paypalOrderId, orderId } = req.body;

  const settings = await Settings.findOne({ _id: 'main' });
  const accessToken = await getPayPalAccessToken(settings);
  const baseUrl = settings.paypalMode === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';

  const response = await axios.post(
    `${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`,
    {},
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (response.data.status === 'COMPLETED') {
    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: 'PAID',
      paymentMethod: 'PAYPAL',
      paymentId: paypalOrderId
    });

    res.json({ success: true, message: 'Paiement PayPal confirmé' });
  } else {
    res.status(400);
    throw new Error('Le paiement PayPal n\'a pas été complété');
  }
});

// ============================================
// CINETPAY INTEGRATION
// https://docs.cinetpay.com/
// ============================================

// @desc    Initialize CinetPay payment
// @route   POST /api/payments/cinetpay/initialize
// @access  Private
const initializeCinetPayPayment = asyncHandler(async (req, res) => {
  const { amount, orderId } = req.body;

  const settings = await Settings.findOne({ _id: 'main' });
  
  if (!settings?.enableCinetpay || !settings?.cinetpayApiKey) {
    res.status(400);
    throw new Error('CinetPay n\'est pas configuré');
  }

  const order = await Order.findById(orderId).populate('user');

  if (!order) {
    res.status(404);
    throw new Error('Commande non trouvée');
  }

  const transactionId = `TXN_${Date.now()}_${orderId.slice(0, 8)}`;

  const response = await axios.post(
    'https://api-checkout.cinetpay.com/v2/payment',
    {
      apikey: settings.cinetpayApiKey,
      site_id: settings.cinetpaySiteId,
      transaction_id: transactionId,
      amount: Math.round(amount),
      currency: settings.currency === 'XOF' ? 'XOF' : 'XAF',
      description: `Commande ${orderId}`,
      customer_name: order.user.fullName || 'Client',
      customer_email: order.user.email,
      customer_phone_number: order.shippingPhone || '',
      customer_address: order.shippingAddress || '',
      customer_city: order.shippingCity || '',
      customer_country: 'CM',
      notify_url: `${process.env.BACKEND_URL}/api/payments/cinetpay/notify`,
      return_url: `${process.env.FRONTEND_URL}/checkout/success?orderId=${orderId}`,
      channels: 'ALL',
      metadata: JSON.stringify({ orderId, userId: req.user.id })
    },
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );

  if (response.data.code === '201') {
    // Sauvegarder le transactionId
    await Order.findByIdAndUpdate(orderId, { paymentId: transactionId });

    res.json({
      paymentUrl: response.data.data.payment_url,
      transactionId: transactionId
    });
  } else {
    res.status(400);
    throw new Error(response.data.message || 'Erreur lors de l\'initialisation du paiement');
  }
});

// @desc    CinetPay notification (webhook)
// @route   POST /api/payments/cinetpay/notify
// @access  Public
const cinetPayNotify = asyncHandler(async (req, res) => {
  const { cpm_trans_id, cpm_site_id } = req.body;

  const settings = await Settings.findOne({ _id: 'main' });

  // Vérifier le statut de la transaction
  const response = await axios.post(
    'https://api-checkout.cinetpay.com/v2/payment/check',
    {
      apikey: settings.cinetpayApiKey,
      site_id: settings.cinetpaySiteId,
      transaction_id: cpm_trans_id
    }
  );

  const { status, metadata } = response.data.data;

  if (status === 'ACCEPTED') {
    const parsedMetadata = JSON.parse(metadata);
    
    await Order.findByIdAndUpdate(parsedMetadata.orderId, {
      paymentStatus: 'PAID',
      paymentMethod: 'CINETPAY'
    });
  }

  res.json({ success: true });
});

// @desc    Check CinetPay payment status
// @route   POST /api/payments/cinetpay/check
// @access  Private
const checkCinetPayStatus = asyncHandler(async (req, res) => {
  const { transactionId } = req.body;

  const settings = await Settings.findOne({ _id: 'main' });

  const response = await axios.post(
    'https://api-checkout.cinetpay.com/v2/payment/check',
    {
      apikey: settings.cinetpayApiKey,
      site_id: settings.cinetpaySiteId,
      transaction_id: transactionId
    }
  );

  const { status, amount, currency, payment_method } = response.data.data;

  res.json({
    status,
    amount,
    currency,
    paymentMethod: payment_method
  });
});

// ============================================
// GET AVAILABLE PAYMENT METHODS
// ============================================

// @desc    Get enabled payment methods (public)
// @route   GET /api/payments/methods
// @access  Public
const getPaymentMethods = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne({ _id: 'main' });
  
  // Créer les settings par défaut si inexistants
  if (!settings) {
    settings = await Settings.create({ _id: 'main', enableCashOnDelivery: true });
  }

  const methods = [];

  if (settings?.enableMobileMoney) {
    methods.push({ id: 'momo', name: 'MTN Mobile Money', icon: '📱', type: 'mobile' });
  }
  if (settings?.enableOrangeMoney) {
    methods.push({ id: 'om', name: 'Orange Money', icon: '🟠', type: 'mobile' });
  }
  if (settings?.enableCashOnDelivery) {
    methods.push({ id: 'cod', name: 'Paiement à la livraison', icon: '💵', type: 'cash' });
  }
  if (settings?.enableStripe && settings?.stripePublicKey) {
    methods.push({ 
      id: 'stripe', 
      name: 'Carte bancaire (Stripe)', 
      icon: '💳', 
      type: 'card',
      publicKey: settings.stripePublicKey 
    });
  }
  if (settings?.enablePaypal && settings?.paypalClientId) {
    methods.push({ 
      id: 'paypal', 
      name: 'PayPal', 
      icon: '🅿️', 
      type: 'paypal',
      clientId: settings.paypalClientId,
      mode: settings.paypalMode
    });
  }
  if (settings?.enableCinetpay && settings?.cinetpayApiKey) {
    methods.push({ 
      id: 'cinetpay', 
      name: 'CinetPay', 
      icon: '🌍', 
      type: 'cinetpay'
    });
  }

  res.json(methods);
});

module.exports = {
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
};
