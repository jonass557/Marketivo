const asyncHandler = require('express-async-handler');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const UserSubscription = require('../models/UserSubscription');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');

// ===== PUBLIC ENDPOINTS =====

// @desc    Get all active subscription plans
// @route   GET /api/subscriptions/plans
// @access  Public
const getActivePlans = asyncHandler(async (req, res) => {
  const plans = await SubscriptionPlan.find({ isActive: true })
    .sort({ priority: 1 })
    .lean();

  res.json(plans.map(p => ({ ...p, id: p._id })));
});

// ===== VENDOR ENDPOINTS =====

// @desc    Get my current subscription
// @route   GET /api/subscriptions/me
// @access  Private/Vendor
const getMySubscription = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) {
    res.status(404);
    throw new Error('Profil vendeur non trouvé');
  }

  const subscription = await UserSubscription.findOne({
    vendor: vendor._id,
    status: 'ACTIVE'
  }).populate('plan');

  const history = await UserSubscription.find({ vendor: vendor._id })
    .populate('plan', 'name price')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  res.json({
    current: subscription ? { ...subscription.toObject(), id: subscription._id } : null,
    history: history.map(h => ({ ...h, id: h._id }))
  });
});

// @desc    Subscribe to a plan
// @route   POST /api/subscriptions/subscribe
// @access  Private/Vendor
const subscribeToPlan = asyncHandler(async (req, res) => {
  const { planId, paymentMethod, paymentReference, duration } = req.body;

  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) {
    res.status(404);
    throw new Error('Profil vendeur non trouvé');
  }

  if (vendor.status !== 'APPROVED') {
    res.status(400);
    throw new Error('Votre boutique doit être approuvée avant de souscrire à un abonnement');
  }

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) {
    res.status(404);
    throw new Error('Plan non trouvé');
  }

  if (!plan.isActive) {
    res.status(400);
    throw new Error('Ce plan n\'est plus disponible');
  }

  if (plan.isFree) {
    res.status(400);
    throw new Error('Vous avez déjà le plan gratuit par défaut');
  }

  // Désactiver l'abonnement actuel
  await UserSubscription.updateMany(
    { vendor: vendor._id, status: 'ACTIVE' },
    { status: 'EXPIRED' }
  );

  // Calculer la durée
  const durationDays = duration === 'quarterly' ? 90 : plan.duration;
  const price = duration === 'quarterly' ? plan.price * 3 * 0.9 : plan.price; // 10% de réduction trimestriel

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + durationDays);

  const subscription = await UserSubscription.create({
    vendor: vendor._id,
    plan: plan._id,
    planSnapshot: {
      name: plan.name,
      price: plan.price,
      commission: plan.commission,
      maxProducts: plan.maxProducts,
      visibilityLevel: plan.visibilityLevel,
      chatPriority: plan.chatPriority,
      supportPremium: plan.supportPremium
    },
    status: 'ACTIVE',
    startDate,
    endDate,
    paymentMethod: paymentMethod || 'mobile_money',
    paymentReference: paymentReference || '',
    amountPaid: price,
    currency: plan.currency
  });

  // Mettre à jour le score de visibilité du vendeur
  vendor.visibilityScore = plan.visibilityLevel * 25;
  await vendor.save();

  // Mettre à jour la visibilité des produits du vendeur
  await Product.updateMany(
    { vendor: vendor._id },
    { visibilityScore: plan.visibilityLevel * 25 }
  );

  const populated = await UserSubscription.findById(subscription._id).populate('plan');

  res.status(201).json({ ...populated.toObject(), id: populated._id });
});

// ===== ADMIN ENDPOINTS =====

// @desc    Get all plans (admin, including inactive)
// @route   GET /api/subscriptions/admin/plans
// @access  Private/Admin
const getAllPlansAdmin = asyncHandler(async (req, res) => {
  const plans = await SubscriptionPlan.find()
    .sort({ priority: 1 })
    .lean();

  // Pour chaque plan, compter les abonnés actifs
  const plansWithStats = await Promise.all(plans.map(async (plan) => {
    const activeSubscribers = await UserSubscription.countDocuments({
      plan: plan._id,
      status: 'ACTIVE'
    });
    return { ...plan, id: plan._id, activeSubscribers };
  }));

  res.json(plansWithStats);
});

// @desc    Create a subscription plan (admin)
// @route   POST /api/subscriptions/admin/plans
// @access  Private/Admin
const createPlan = asyncHandler(async (req, res) => {
  const {
    name, description, price, currency, duration, commission,
    maxProducts, visibilityLevel, advantages, priority,
    chatIncluded, chatPriority, supportPremium,
    isFree, isRecommended, color, icon
  } = req.body;

  if (!name || price === undefined || commission === undefined) {
    res.status(400);
    throw new Error('Nom, prix et commission sont requis');
  }

  // Générer slug
  const slug = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const existingSlug = await SubscriptionPlan.findOne({ slug });
  if (existingSlug) {
    res.status(400);
    throw new Error('Un plan avec ce nom existe déjà');
  }

  const plan = await SubscriptionPlan.create({
    name,
    slug,
    description: description || '',
    price: parseFloat(price),
    currency: currency || 'XAF',
    duration: parseInt(duration) || 30,
    commission: parseFloat(commission),
    maxProducts: parseInt(maxProducts) || 0,
    visibilityLevel: parseInt(visibilityLevel) || 1,
    advantages: advantages || [],
    priority: parseInt(priority) || 0,
    chatIncluded: chatIncluded !== false,
    chatPriority: chatPriority || false,
    supportPremium: supportPremium || false,
    isFree: isFree || false,
    isRecommended: isRecommended || false,
    color: color || '#6b7280',
    icon: icon || ''
  });

  res.status(201).json({ ...plan.toObject(), id: plan._id });
});

// @desc    Update a subscription plan (admin)
// @route   PUT /api/subscriptions/admin/plans/:id
// @access  Private/Admin
const updatePlan = asyncHandler(async (req, res) => {
  const plan = await SubscriptionPlan.findById(req.params.id);
  if (!plan) {
    res.status(404);
    throw new Error('Plan non trouvé');
  }

  const fields = [
    'name', 'description', 'price', 'currency', 'duration', 'commission',
    'maxProducts', 'visibilityLevel', 'advantages', 'priority',
    'chatIncluded', 'chatPriority', 'supportPremium',
    'isActive', 'isRecommended', 'color', 'icon'
  ];

  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      plan[field] = req.body[field];
    }
  });

  // Si on change le nom, mettre à jour le slug
  if (req.body.name && req.body.name !== plan.name) {
    plan.slug = req.body.name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  await plan.save();

  res.json({ ...plan.toObject(), id: plan._id });
});

// @desc    Toggle plan active status (admin)
// @route   PUT /api/subscriptions/admin/plans/:id/toggle
// @access  Private/Admin
const togglePlanStatus = asyncHandler(async (req, res) => {
  const plan = await SubscriptionPlan.findById(req.params.id);
  if (!plan) {
    res.status(404);
    throw new Error('Plan non trouvé');
  }

  // Empêcher la désactivation du plan gratuit
  if (plan.isFree && plan.isActive) {
    res.status(400);
    throw new Error('Le plan gratuit ne peut pas être désactivé');
  }

  plan.isActive = !plan.isActive;
  await plan.save();

  res.json({ ...plan.toObject(), id: plan._id });
});

// @desc    Set plan as recommended (admin)
// @route   PUT /api/subscriptions/admin/plans/:id/recommend
// @access  Private/Admin
const setRecommended = asyncHandler(async (req, res) => {
  // Retirer "recommandé" de tous les plans
  await SubscriptionPlan.updateMany({}, { isRecommended: false });

  const plan = await SubscriptionPlan.findById(req.params.id);
  if (!plan) {
    res.status(404);
    throw new Error('Plan non trouvé');
  }

  plan.isRecommended = true;
  await plan.save();

  res.json({ ...plan.toObject(), id: plan._id });
});

// @desc    Delete/archive a plan (admin)
// @route   DELETE /api/subscriptions/admin/plans/:id
// @access  Private/Admin
const deletePlan = asyncHandler(async (req, res) => {
  const plan = await SubscriptionPlan.findById(req.params.id);
  if (!plan) {
    res.status(404);
    throw new Error('Plan non trouvé');
  }

  if (plan.isFree) {
    res.status(400);
    throw new Error('Le plan gratuit ne peut pas être supprimé');
  }

  // Vérifier s'il y a des abonnés actifs
  const activeSubscribers = await UserSubscription.countDocuments({
    plan: plan._id,
    status: 'ACTIVE'
  });

  if (activeSubscribers > 0) {
    // Archiver au lieu de supprimer
    plan.isActive = false;
    await plan.save();
    res.json({ message: 'Plan archivé (des abonnés actifs existent)', archived: true });
  } else {
    await SubscriptionPlan.findByIdAndDelete(req.params.id);
    res.json({ message: 'Plan supprimé' });
  }
});

// @desc    Get all subscriptions (admin)
// @route   GET /api/subscriptions/admin/subscriptions
// @access  Private/Admin
const getAllSubscriptions = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let query = {};
  if (status) query.status = status;

  const subscriptions = await UserSubscription.find(query)
    .populate('vendor')
    .populate('plan', 'name price')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const total = await UserSubscription.countDocuments(query);

  res.json({
    subscriptions: subscriptions.map(s => ({ ...s, id: s._id })),
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    total
  });
});

// @desc    Check and expire subscriptions (cron job / admin trigger)
// @route   POST /api/subscriptions/admin/check-expiry
// @access  Private/Admin
const checkExpiredSubscriptions = asyncHandler(async (req, res) => {
  const now = new Date();

  // Trouver les abonnements expirés
  const expired = await UserSubscription.find({
    status: 'ACTIVE',
    endDate: { $lt: now }
  }).populate('vendor');

  let count = 0;

  for (const sub of expired) {
    sub.status = 'EXPIRED';
    await sub.save();

    // Rétrograder le vendeur vers le plan gratuit
    const freePlan = await SubscriptionPlan.findOne({ isFree: true, isActive: true });
    if (freePlan && sub.vendor) {
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 10);

      await UserSubscription.create({
        vendor: sub.vendor._id,
        plan: freePlan._id,
        planSnapshot: {
          name: freePlan.name,
          price: 0,
          commission: freePlan.commission,
          maxProducts: freePlan.maxProducts,
          visibilityLevel: freePlan.visibilityLevel,
          chatPriority: freePlan.chatPriority,
          supportPremium: freePlan.supportPremium
        },
        status: 'ACTIVE',
        startDate: new Date(),
        endDate,
        paymentMethod: 'free',
        amountPaid: 0
      });

      // Mettre à jour la visibilité
      sub.vendor.visibilityScore = freePlan.visibilityLevel * 25;
      await sub.vendor.save();

      await Product.updateMany(
        { vendor: sub.vendor._id },
        { visibilityScore: freePlan.visibilityLevel * 25 }
      );
    }

    count++;
  }

  res.json({ message: `${count} abonnement(s) expiré(s) traité(s)` });
});

module.exports = {
  getActivePlans,
  getMySubscription,
  subscribeToPlan,
  getAllPlansAdmin,
  createPlan,
  updatePlan,
  togglePlanStatus,
  setRecommended,
  deletePlan,
  getAllSubscriptions,
  checkExpiredSubscriptions
};
