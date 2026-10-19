const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Order = require('../models/Order');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const UserSubscription = require('../models/UserSubscription');
const generateToken = require('../utils/generateToken');

// Fonction pour générer un slug
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// @desc    Register as vendor
// @route   POST /api/vendors/register
// @access  Public
const registerVendor = asyncHandler(async (req, res) => {
  const { fullName, email, password, shopName, phone, whatsapp, city, country, businessType, description, planId } = req.body;

  if (!fullName || !email || !password || !shopName || !phone) {
    res.status(400);
    throw new Error('Veuillez remplir tous les champs requis');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('Cet email est déjà utilisé');
  }

  const shopExists = await Vendor.findOne({ shopName });
  if (shopExists) {
    res.status(400);
    throw new Error('Ce nom de boutique est déjà pris');
  }

  // Générer slug unique pour la boutique
  let baseSlug = generateSlug(shopName);
  let slug = baseSlug;
  let counter = 1;
  while (await Vendor.findOne({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Créer le user avec rôle VENDOR
  const user = await User.create({
    fullName,
    email,
    password: hashedPassword,
    phone,
    role: 'VENDOR'
  });

  // Créer le profil vendeur (auto-approuvé car pas de paiement requis pour l'instant)
  const vendor = await Vendor.create({
    user: user._id,
    shopName,
    slug,
    description: description || '',
    phone,
    whatsapp: whatsapp || phone,
    email,
    city: city || '',
    country: country || 'Cameroun',
    businessType: businessType || 'individual',
    status: 'APPROVED'
  });

  // Lier le vendor au user
  user.vendor = vendor._id;
  await user.save();

  // Déterminer le plan à assigner
  let selectedPlan = null;
  if (planId) {
    selectedPlan = await SubscriptionPlan.findById(planId);
  }

  // Si pas de plan choisi ou plan introuvable, utiliser le plan gratuit
  if (!selectedPlan) {
    selectedPlan = await SubscriptionPlan.findOne({ isFree: true, isActive: true });
  }

  if (selectedPlan) {
    // Démarrer à minuit du jour d'inscription
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    if (selectedPlan.isFree) {
      endDate.setFullYear(endDate.getFullYear() + 10);
    } else {
      endDate.setDate(endDate.getDate() + (selectedPlan.duration || 30));
    }

    await UserSubscription.create({
      vendor: vendor._id,
      plan: selectedPlan._id,
      planSnapshot: {
        name: selectedPlan.name,
        price: selectedPlan.price,
        commission: selectedPlan.commission,
        maxProducts: selectedPlan.maxProducts,
        visibilityLevel: selectedPlan.visibilityLevel,
        chatPriority: selectedPlan.chatPriority,
        supportPremium: selectedPlan.supportPremium
      },
      status: 'ACTIVE',
      startDate,
      endDate,
      paymentMethod: 'free',
      amountPaid: 0
    });
  }

  res.status(201).json({
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    vendor: {
      id: vendor._id,
      shopName: vendor.shopName,
      slug: vendor.slug,
      status: vendor.status
    },
    token: generateToken(user._id)
  });
});

// @desc    Get vendor profile (own)
// @route   GET /api/vendors/me
// @access  Private/Vendor
const getMyVendorProfile = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id }).populate('user', 'fullName email');

  if (!vendor) {
    res.status(404);
    throw new Error('Profil vendeur non trouvé');
  }

  // Récupérer l'abonnement actif
  const subscription = await UserSubscription.findOne({
    vendor: vendor._id,
    status: 'ACTIVE'
  }).populate('plan');

  // Compter les produits
  const productCount = await Product.countDocuments({ vendor: vendor._id });

  res.json({
    ...vendor.toObject(),
    id: vendor._id,
    subscription: subscription || null,
    productCount
  });
});

// @desc    Update vendor profile
// @route   PUT /api/vendors/me
// @access  Private/Vendor
const updateVendorProfile = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });

  if (!vendor) {
    res.status(404);
    throw new Error('Profil vendeur non trouvé');
  }

  const { shopName, description, logo, banner, phone, whatsapp, address, city, country, socialLinks, acceptedPayments } = req.body;

  if (shopName && shopName !== vendor.shopName) {
    const shopExists = await Vendor.findOne({ shopName, _id: { $ne: vendor._id } });
    if (shopExists) {
      res.status(400);
      throw new Error('Ce nom de boutique est déjà pris');
    }
    vendor.shopName = shopName;
    // Mettre à jour le slug
    let baseSlug = generateSlug(shopName);
    let slug = baseSlug;
    let counter = 1;
    while (await Vendor.findOne({ slug, _id: { $ne: vendor._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    vendor.slug = slug;
  }

  if (description !== undefined) vendor.description = description;
  if (logo !== undefined) vendor.logo = logo;
  if (banner !== undefined) vendor.banner = banner;
  if (phone !== undefined) vendor.phone = phone;
  if (whatsapp !== undefined) vendor.whatsapp = whatsapp;
  if (address !== undefined) vendor.address = address;
  if (city !== undefined) vendor.city = city;
  if (country !== undefined) vendor.country = country;
  if (socialLinks !== undefined) vendor.socialLinks = { ...vendor.socialLinks?.toObject?.() || {}, ...socialLinks };
  if (acceptedPayments !== undefined) vendor.acceptedPayments = acceptedPayments;

  await vendor.save();

  res.json({ ...vendor.toObject(), id: vendor._id });
});

// @desc    Get public vendor shop by slug
// @route   GET /api/vendors/shop/:slug
// @access  Public
const getVendorShop = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ slug: req.params.slug, status: 'APPROVED' })
    .populate('user', 'fullName');

  if (!vendor) {
    res.status(404);
    throw new Error('Boutique non trouvée');
  }

  // Récupérer les produits du vendeur
  const { page = 1, limit = 20, category, sort } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let query = { vendor: vendor._id, isApproved: true };
  if (category) {
    const Category = require('../models/Category');
    const cat = await Category.findOne({ slug: category });
    if (cat) query.category = cat._id;
  }

  let sortOption = { createdAt: -1 };
  if (sort === 'price-low') sortOption = { price: 1 };
  else if (sort === 'price-high') sortOption = { price: -1 };
  else if (sort === 'popular') sortOption = { isPopular: -1 };

  const products = await Product.find(query)
    .populate('category')
    .sort(sortOption)
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const total = await Product.countDocuments(query);

  res.json({
    vendor: {
      id: vendor._id,
      shopName: vendor.shopName,
      slug: vendor.slug,
      description: vendor.description,
      logo: vendor.logo,
      banner: vendor.banner,
      rating: vendor.rating,
      totalReviews: vendor.totalReviews,
      totalSales: vendor.totalSales,
      badges: vendor.badges,
      isOnline: vendor.isOnline,
      lastSeen: vendor.lastSeen,
      city: vendor.city,
      country: vendor.country,
      phone: vendor.phone,
      whatsapp: vendor.whatsapp,
      socialLinks: vendor.socialLinks,
      acceptedPayments: vendor.acceptedPayments,
      userId: vendor.user._id
    },
    products: products.map(p => ({ ...p, id: p._id })),
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    total
  });
});

// @desc    Get all vendors (public listing)
// @route   GET /api/vendors
// @access  Public
const getVendors = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, city } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let query = { status: 'APPROVED' };

  if (search) {
    query.$or = [
      { shopName: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  if (city) {
    query.city = { $regex: city, $options: 'i' };
  }

  const vendors = await Vendor.find(query)
    .populate('user', 'fullName')
    .sort({ visibilityScore: -1, rating: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const total = await Vendor.countDocuments(query);

  res.json({
    vendors: vendors.map(v => ({ ...v, id: v._id })),
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    total
  });
});

// @desc    Get vendor dashboard stats
// @route   GET /api/vendors/me/stats
// @access  Private/Vendor
const getVendorStats = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) {
    res.status(404);
    throw new Error('Profil vendeur non trouvé');
  }

  const totalProducts = await Product.countDocuments({ vendor: vendor._id });
  
  // Commandes contenant des produits de ce vendeur
  const orders = await Order.find({ 'items.vendor': vendor._id });
  const totalOrders = orders.length;
  
  let totalRevenue = 0;
  let totalCommission = 0;
  orders.forEach(order => {
    order.items.forEach(item => {
      if (item.vendor && item.vendor.toString() === vendor._id.toString()) {
        totalRevenue += item.price * item.quantity;
        totalCommission += item.commissionAmount || 0;
      }
    });
  });

  const pendingOrders = orders.filter(o => o.status === 'PENDING').length;
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED').length;

  // Abonnement actif
  const subscription = await UserSubscription.findOne({
    vendor: vendor._id,
    status: 'ACTIVE'
  }).populate('plan');

  res.json({
    totalProducts,
    totalOrders,
    totalRevenue,
    totalCommission,
    netRevenue: totalRevenue - totalCommission,
    pendingOrders,
    deliveredOrders,
    rating: vendor.rating,
    totalReviews: vendor.totalReviews,
    subscription: subscription ? {
      planName: subscription.planSnapshot.name,
      endDate: subscription.endDate,
      commission: subscription.planSnapshot.commission,
      maxProducts: subscription.planSnapshot.maxProducts
    } : null
  });
});

// @desc    Get vendor orders
// @route   GET /api/vendors/me/orders
// @access  Private/Vendor
const getVendorOrders = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) {
    res.status(404);
    throw new Error('Profil vendeur non trouvé');
  }

  const { status, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let query = { 'items.vendor': vendor._id };
  if (status) query.status = status;

  const orders = await Order.find(query)
    .populate('user', 'fullName email phone')
    .populate('items.product')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const total = await Order.countDocuments(query);

  // Filtrer pour ne montrer que les items du vendeur
  const vendorOrders = orders.map(order => ({
    ...order,
    id: order._id,
    items: order.items.filter(item => 
      item.vendor && item.vendor.toString() === vendor._id.toString()
    )
  }));

  res.json({
    orders: vendorOrders,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    total
  });
});

// ===== ADMIN ENDPOINTS =====

// @desc    Get all vendors (admin)
// @route   GET /api/vendors/admin/all
// @access  Private/Admin
const getAllVendorsAdmin = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let query = {};
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { shopName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const vendors = await Vendor.find(query)
    .populate('user', 'fullName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const total = await Vendor.countDocuments(query);

  // Pour chaque vendeur, récupérer le nombre de produits et l'abonnement
  const vendorsWithDetails = await Promise.all(vendors.map(async (v) => {
    const productCount = await Product.countDocuments({ vendor: v._id });
    const subscription = await UserSubscription.findOne({
      vendor: v._id,
      status: 'ACTIVE'
    }).populate('plan', 'name');

    return {
      ...v,
      id: v._id,
      productCount,
      currentPlan: subscription ? subscription.planSnapshot.name : 'Aucun'
    };
  }));

  res.json({
    vendors: vendorsWithDetails,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    total
  });
});

// @desc    Update vendor status (admin)
// @route   PUT /api/vendors/admin/:id/status
// @access  Private/Admin
const updateVendorStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED'];

  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error('Statut invalide');
  }

  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) {
    res.status(404);
    throw new Error('Vendeur non trouvé');
  }

  vendor.status = status;
  if (status === 'APPROVED' && !vendor.badges.includes('VERIFIED')) {
    vendor.badges.push('VERIFIED');
  }
  await vendor.save();

  // Notifier le vendeur via WebSocket
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${vendor.user}`).emit('vendorStatusUpdated', { status });
  }

  res.json({ ...vendor.toObject(), id: vendor._id });
});

// @desc    Update vendor commission override (admin)
// @route   PUT /api/vendors/admin/:id/commission
// @access  Private/Admin
const updateVendorCommission = asyncHandler(async (req, res) => {
  const { commission } = req.body;

  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) {
    res.status(404);
    throw new Error('Vendeur non trouvé');
  }

  vendor.commissionOverride = commission !== null ? commission : null;
  await vendor.save();

  res.json({ ...vendor.toObject(), id: vendor._id });
});

// @desc    Get top vendors (public – homepage)
// @route   GET /api/vendors/top
// @access  Public
const getTopVendors = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 8;

  const vendors = await Vendor.find({ status: 'APPROVED' })
    .populate('user', 'fullName')
    .sort({ rating: -1, totalSales: -1, totalReviews: -1 })
    .limit(limit)
    .lean();

  // Ajouter le nombre de produits pour chaque vendeur
  const vendorsWithCount = await Promise.all(vendors.map(async (v) => {
    const productCount = await Product.countDocuments({ vendor: v._id });
    return { ...v, id: v._id, productCount };
  }));

  res.json(vendorsWithCount);
});

module.exports = {
  registerVendor,
  getMyVendorProfile,
  updateVendorProfile,
  getVendorShop,
  getVendors,
  getTopVendors,
  getVendorStats,
  getVendorOrders,
  getAllVendorsAdmin,
  updateVendorStatus,
  updateVendorCommission
};
