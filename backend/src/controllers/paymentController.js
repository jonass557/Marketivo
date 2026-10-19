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
// IKEEPAY INTEGRATION (Mobile Money H2H)
// https://api.ikeepay.com
// ============================================

// @desc    Initiate iKeepay payin (encaissement)
// @route   POST /api/payments/ikeepay/payin
// @access  Private
const initiateIkeepayPayment = asyncHandler(async (req, res) => {
  const {
    orderId,
    amount,
    currency,
    country,
    phoneNumber,
    operator,
    otp
  } = req.body;

  if (!orderId || !phoneNumber || !operator) {
    res.status(400);
    throw new Error('Champs requis manquants (orderId, phoneNumber, operator)');
  }

  const settings = await Settings.findById('main');
  if (!settings?.enableIkeepay || !settings?.ikeepaySecretKey) {
    res.status(400);
    throw new Error('Le paiement iKeepay Mobile Money n\'est pas activé ou configuré par l\'administrateur');
  }

  const order = await Order.findById(orderId).populate('user', 'email fullName');
  if (!order) {
    res.status(404);
    throw new Error('Commande non trouvée');
  }

  // Nettoyage et formatage
  const cleanPhone = String(phoneNumber).replace(/[^0-9]/g, '');
  const cleanOperator = String(operator).toUpperCase().trim();
  const cleanCountry = (country || 'CI').toUpperCase().trim();
  const payCurrency = (currency || settings.currency || 'XOF').toUpperCase().trim();
  const payAmount = Number(amount || order.totalAmount);
  
  // Référence unique de transaction
  const externalReference = `REF_${Date.now()}_${order._id.toString().slice(-6)}`;

  const payload = {
    amount: payAmount,
    currency: payCurrency,
    country: cleanCountry,
    phoneNumber: cleanPhone,
    operator: cleanOperator,
    external_reference: externalReference,
    customer_email: req.user?.email || order.user?.email || 'customer@marketivo.com'
  };

  if (otp && String(otp).trim()) {
    payload.otp = String(otp).trim();
  }

  try {
    const response = await axios.post('https://api.ikeepay.com/h2h-payin', payload, {
      headers: {
        'x-api-key': settings.ikeepaySecretKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const responseData = response.data;

    // Enregistrer la référence dans la commande
    order.paymentMethod = 'ikeepay';
    order.paymentReference = externalReference;
    if (responseData?.data?.provider_reference) {
      order.providerReference = responseData.data.provider_reference;
    }
    await order.save();

    res.json({
      success: true,
      external_reference: externalReference,
      payment_link: responseData?.payment_link || responseData?.data?.payment_link || null,
      message: responseData?.message || 'Demande de paiement envoyée avec succès',
      data: responseData
    });
  } catch (error) {
    console.error('Erreur iKeepay Payin:', error.response?.data || error.message);
    const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Échec de l\'initialisation iKeepay';
    res.status(error.response?.status || 500);
    throw new Error(errorMsg);
  }
});

// @desc    Verify iKeepay transaction
// @route   GET /api/payments/ikeepay/verify/:reference
// @access  Private
const verifyIkeepayPayment = asyncHandler(async (req, res) => {
  const { reference } = req.params;

  const settings = await Settings.findById('main');
  if (!settings?.enableIkeepay || !settings?.ikeepaySecretKey) {
    res.status(400);
    throw new Error('iKeepay n\'est pas configuré');
  }

  try {
    const response = await axios.get(`https://api.ikeepay.com/h2h-verify/${encodeURIComponent(reference)}`, {
      headers: {
        'x-api-key': settings.ikeepaySecretKey
      },
      timeout: 15000
    });

    const result = response.data;
    const txData = result?.data || result;
    const txStatus = (txData?.status || '').toLowerCase();

    // Retrouver la commande correspondante
    let order = await Order.findOne({
      $or: [
        { paymentReference: reference },
        { providerReference: reference }
      ]
    });

    if (!order && reference.includes('_')) {
      const parts = reference.split('_');
      const suffix = parts[parts.length - 1];
      if (suffix.length === 6) {
        order = await Order.findOne({ _id: { $regex: suffix + '$' } });
      }
    }

    if (order) {
      if ((txStatus === 'completed' || txStatus === 'success') && order.paymentStatus !== 'PAID') {
        order.paymentStatus = 'PAID';
        order.status = 'CONFIRMED';
        order.paymentMethod = 'ikeepay';
        if (txData?.provider_reference) {
          order.providerReference = txData.provider_reference;
        }
        await order.save();
      } else if (txStatus === 'failed') {
        order.paymentStatus = 'FAILED';
        await order.save();
      }
    }

    res.json({
      success: true,
      status: txStatus,
      data: txData,
      isPaid: txStatus === 'completed' || txStatus === 'success',
      orderId: order?._id
    });
  } catch (error) {
    console.error('Erreur iKeepay Verify:', error.response?.data || error.message);
    const errorMsg = error.response?.data?.message || error.message || 'Erreur lors de la vérification iKeepay';
    res.status(error.response?.status || 500);
    throw new Error(errorMsg);
  }
});

// @desc    Webhook for iKeepay async notifications
// @route   POST /api/payments/ikeepay/webhook
// @access  Public
const ikeepayWebhook = asyncHandler(async (req, res) => {
  console.log('🔔 Webhook iKeepay reçu:', JSON.stringify(req.body));
  const { event, data } = req.body || {};

  if (!data) {
    return res.status(200).json({ received: true, ignored: true });
  }

  const {
    type,
    external_reference,
    provider_reference,
    status
  } = data;

  const normalizedStatus = (status || '').toLowerCase();

  if (type === 'payin' && (normalizedStatus === 'completed' || normalizedStatus === 'success')) {
    let order = await Order.findOne({
      $or: [
        { paymentReference: external_reference },
        { providerReference: provider_reference }
      ]
    });

    if (!order && external_reference && external_reference.includes('_')) {
      const parts = external_reference.split('_');
      const suffix = parts[parts.length - 1];
      if (suffix.length === 6) {
        order = await Order.findOne({ _id: { $regex: suffix + '$' } });
      }
    }

    if (order) {
      order.paymentStatus = 'PAID';
      order.status = 'CONFIRMED';
      order.paymentMethod = 'ikeepay';
      if (provider_reference) {
        order.providerReference = provider_reference;
      }
      await order.save();
      console.log(`✅ Commande ${order._id} marquée comme PAYÉE via Webhook iKeepay`);
    } else {
      console.warn(`⚠️ Commande non trouvée pour la référence ${external_reference}`);
    }
  }

  res.status(200).json({ received: true, status: 'ok' });
});

// @desc    Initiate iKeepay payout (retrait)
// @route   POST /api/payments/ikeepay/payout
// @access  Private
const initiateIkeepayPayout = asyncHandler(async (req, res) => {
  const { amount, currency, country, phoneNumber, operator, reference } = req.body;

  const settings = await Settings.findById('main');
  if (!settings?.enableIkeepay || !settings?.ikeepaySecretKey) {
    res.status(400);
    throw new Error('iKeepay n\'est pas configuré');
  }

  const externalReference = reference || `PAYOUT_${Date.now()}`;

  const payload = {
    amount: Number(amount),
    currency: (currency || settings.currency || 'XOF').toUpperCase(),
    country: (country || 'CI').toUpperCase(),
    phoneNumber: String(phoneNumber).replace(/[^0-9]/g, ''),
    operator: String(operator).toUpperCase(),
    external_reference: externalReference
  };

  try {
    const response = await axios.post('https://api.ikeepay.com/h2h-payout', payload, {
      headers: {
        'x-api-key': settings.ikeepaySecretKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    res.json({
      success: true,
      external_reference: externalReference,
      data: response.data
    });
  } catch (error) {
    console.error('Erreur iKeepay Payout:', error.response?.data || error.message);
    res.status(error.response?.status || 500);
    throw new Error(error.response?.data?.message || error.message || 'Échec du retrait iKeepay');
  }
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

  // iKeepay Mobile Money (H2H multi-pays et multi-opérateurs)
  if (settings?.enableIkeepay && settings?.ikeepaySecretKey) {
    methods.push({ 
      id: 'ikeepay', 
      name: 'Mobile Money (Orange, MTN, Wave, Moov...)', 
      icon: '📱', 
      type: 'ikeepay',
      description: 'Paiement direct sécurisé par Mobile Money (Côte d\'Ivoire, Sénégal, Cameroun, Burkina Faso...)'
    });
  }

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
  // iKeepay
  initiateIkeepayPayment,
  verifyIkeepayPayment,
  ikeepayWebhook,
  initiateIkeepayPayout,
  // General
  getPaymentMethods
};
