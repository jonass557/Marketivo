const asyncHandler = require('express-async-handler');
const Settings = require('../models/Settings');

// Liste des devises supportées
const CURRENCIES = [
  { code: 'XAF', symbol: 'FCFA', name: 'Franc CFA (CEMAC)', country: 'Cameroun, Gabon, Congo...' },
  { code: 'XOF', symbol: 'FCFA', name: 'Franc CFA (UEMOA)', country: 'Sénégal, Côte d\'Ivoire...' },
  { code: 'EUR', symbol: '€', name: 'Euro', country: 'France, Allemagne...' },
  { code: 'USD', symbol: '$', name: 'Dollar US', country: 'États-Unis' },
  { code: 'GBP', symbol: '£', name: 'Livre Sterling', country: 'Royaume-Uni' },
  { code: 'NGN', symbol: '₦', name: 'Naira', country: 'Nigeria' },
  { code: 'GHS', symbol: 'GH₵', name: 'Cedi', country: 'Ghana' },
  { code: 'KES', symbol: 'KSh', name: 'Shilling Kenyan', country: 'Kenya' },
  { code: 'ZAR', symbol: 'R', name: 'Rand', country: 'Afrique du Sud' },
  { code: 'MAD', symbol: 'DH', name: 'Dirham', country: 'Maroc' },
  { code: 'TND', symbol: 'DT', name: 'Dinar Tunisien', country: 'Tunisie' },
  { code: 'EGP', symbol: 'E£', name: 'Livre Égyptienne', country: 'Égypte' },
];

// Liste des thèmes prédéfinis
const THEMES = [
  { name: 'Orange (Défaut)', primary: '#f97316', secondary: '#1f2937', accent: '#10b981' },
  { name: 'Bleu Professionnel', primary: '#3b82f6', secondary: '#1e293b', accent: '#06b6d4' },
  { name: 'Vert Nature', primary: '#22c55e', secondary: '#14532d', accent: '#84cc16' },
  { name: 'Rouge Passion', primary: '#ef4444', secondary: '#1f2937', accent: '#f59e0b' },
  { name: 'Violet Luxe', primary: '#8b5cf6', secondary: '#1e1b4b', accent: '#ec4899' },
  { name: 'Rose Élégant', primary: '#ec4899', secondary: '#831843', accent: '#f472b6' },
  { name: 'Cyan Moderne', primary: '#06b6d4', secondary: '#164e63', accent: '#22d3ee' },
  { name: 'Jaune Soleil', primary: '#eab308', secondary: '#422006', accent: '#facc15' },
];

// @desc    Get settings
// @route   GET /api/settings
// @access  Public
const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findById('main').lean();

  // Créer les paramètres par défaut s'ils n'existent pas
  if (!settings) {
    settings = await Settings.create({ _id: 'main' });
    settings = settings.toObject();
  }

  const hasIkeepaySecretKey = !!settings.ikeepaySecretKey;

  // Sécuriser les clés sensibles avant de renvoyer
  res.json({
    ...settings,
    id: settings._id,
    hasIkeepaySecretKey,
    // Ne jamais renvoyer la clé secrète en clair
    ikeepaySecretKey: hasIkeepaySecretKey ? '••••••••••••••••••••••••••••••••' : ''
  });
});

// @desc    Update settings
// @route   PUT /api/settings
// @access  Private/Admin
const updateSettings = asyncHandler(async (req, res) => {
  const {
    storeName,
    storeLogo,
    storeDescription,
    storeEmail,
    storePhone,
    storeAddress,
    currency,
    currencySymbol,
    currencyPosition,
    adminEmail,
    adminWhatsApp,
    orderNotifications,
    stockAlerts,
    primaryColor,
    secondaryColor,
    accentColor,
    enableShipping,
    freeShippingThreshold,
    defaultShippingFee,
    estimatedDelivery,
    enableMobileMoney,
    enableOrangeMoney,
    enableCashOnDelivery,
    // Stripe
    enableStripe,
    stripePublicKey,
    stripeSecretKey,
    stripeWebhookSecret,
    // PayPal
    enablePaypal,
    paypalClientId,
    paypalClientSecret,
    paypalMode,
    // CinetPay
    enableCinetpay,
    cinetpayApiKey,
    cinetpaySiteId,
    cinetpaySecretKey,
    cinetpayMode,
    // iKeepay
    enableIkeepay,
    ikeepaySecretKey,
    // SEO
    metaTitle,
    metaDescription,
    // Footer
    footerEmail,
    footerPhone,
    footerAddress
  } = req.body;

  // Vérifier si les paramètres existent
  let settings = await Settings.findById('main');

  if (!settings) {
    settings = await Settings.create({ _id: 'main' });
  }

  // Mettre à jour
  const updateData = {
    storeName: storeName ?? settings.storeName,
    storeLogo: storeLogo ?? settings.storeLogo,
    storeDescription: storeDescription ?? settings.storeDescription,
    storeEmail: storeEmail ?? settings.storeEmail,
    storePhone: storePhone ?? settings.storePhone,
    storeAddress: storeAddress ?? settings.storeAddress,
    currency: currency ?? settings.currency,
    currencySymbol: currencySymbol ?? settings.currencySymbol,
    currencyPosition: currencyPosition ?? settings.currencyPosition,
    adminEmail: adminEmail ?? settings.adminEmail,
    adminWhatsApp: adminWhatsApp ?? settings.adminWhatsApp,
    orderNotifications: orderNotifications ?? settings.orderNotifications,
    stockAlerts: stockAlerts ?? settings.stockAlerts,
    primaryColor: primaryColor ?? settings.primaryColor,
    secondaryColor: secondaryColor ?? settings.secondaryColor,
    accentColor: accentColor ?? settings.accentColor,
    enableShipping: enableShipping ?? settings.enableShipping,
    freeShippingThreshold: freeShippingThreshold ?? settings.freeShippingThreshold,
    defaultShippingFee: defaultShippingFee ?? settings.defaultShippingFee,
    estimatedDelivery: estimatedDelivery ?? settings.estimatedDelivery,
    enableMobileMoney: enableMobileMoney ?? settings.enableMobileMoney,
    enableOrangeMoney: enableOrangeMoney ?? settings.enableOrangeMoney,
    enableCashOnDelivery: enableCashOnDelivery ?? settings.enableCashOnDelivery,
    enableStripe: enableStripe ?? settings.enableStripe,
    stripePublicKey: stripePublicKey ?? settings.stripePublicKey,
    stripeSecretKey: stripeSecretKey ?? settings.stripeSecretKey,
    stripeWebhookSecret: stripeWebhookSecret ?? settings.stripeWebhookSecret,
    enablePaypal: enablePaypal ?? settings.enablePaypal,
    paypalClientId: paypalClientId ?? settings.paypalClientId,
    paypalClientSecret: paypalClientSecret ?? settings.paypalClientSecret,
    paypalMode: paypalMode ?? settings.paypalMode,
    enableCinetpay: enableCinetpay ?? settings.enableCinetpay,
    cinetpayApiKey: cinetpayApiKey ?? settings.cinetpayApiKey,
    cinetpaySiteId: cinetpaySiteId ?? settings.cinetpaySiteId,
    cinetpaySecretKey: cinetpaySecretKey ?? settings.cinetpaySecretKey,
    cinetpayMode: cinetpayMode ?? settings.cinetpayMode,
    enableIkeepay: enableIkeepay !== undefined ? enableIkeepay : settings.enableIkeepay,
    metaTitle: metaTitle ?? settings.metaTitle,
    metaDescription: metaDescription ?? settings.metaDescription,
    footerEmail: footerEmail ?? settings.footerEmail,
    footerPhone: footerPhone ?? settings.footerPhone,
    footerAddress: footerAddress ?? settings.footerAddress
  };

  // Mettre à jour la clé iKeepay uniquement si une nouvelle valeur réelle est transmise (et pas les puces de masquage)
  if (ikeepaySecretKey && typeof ikeepaySecretKey === 'string' && !ikeepaySecretKey.includes('•••') && ikeepaySecretKey.trim().length > 0) {
    updateData.ikeepaySecretKey = ikeepaySecretKey.trim();
  }

  const updatedSettings = await Settings.findByIdAndUpdate('main', updateData, { new: true });
  const hasIkeepaySecretKey = !!updatedSettings.ikeepaySecretKey;

  res.json({
    message: 'Paramètres mis à jour avec succès',
    settings: {
      ...updatedSettings.toObject(),
      id: updatedSettings._id,
      hasIkeepaySecretKey,
      ikeepaySecretKey: hasIkeepaySecretKey ? '••••••••••••••••••••••••••••••••' : ''
    }
  });
});

// @desc    Get available currencies
// @route   GET /api/settings/currencies
// @access  Public
const getCurrencies = asyncHandler(async (req, res) => {
  res.json(CURRENCIES);
});

// @desc    Get available themes
// @route   GET /api/settings/themes
// @access  Public
const getThemes = asyncHandler(async (req, res) => {
  res.json(THEMES);
});

module.exports = {
  getSettings,
  updateSettings,
  getCurrencies,
  getThemes
};
