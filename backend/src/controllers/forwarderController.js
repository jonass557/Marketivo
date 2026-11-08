const asyncHandler = require('express-async-handler');
const Forwarder = require('../models/Forwarder');
const User = require('../models/User');

// @desc    Get all approved forwarders with filters (Public)
// @route   GET /api/forwarders
// @access  Public
const getForwarders = asyncHandler(async (req, res) => {
  const { originCountry, destinationCountry, mode, verifiedOnly, search } = req.query;

  const query = { status: 'APPROVED' };

  if (verifiedOnly === 'true') {
    query.isVerified = true;
  }

  if (originCountry) {
    query['routes.originCountry'] = new RegExp(originCountry, 'i');
  }

  if (destinationCountry) {
    query['routes.destinationCountry'] = new RegExp(destinationCountry, 'i');
  }

  if (mode) {
    query['routes.mode'] = mode.toUpperCase();
  }

  if (search) {
    query.$or = [
      { companyName: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const forwarders = await Forwarder.find(query)
    .populate('user', 'fullName email phone')
    .sort({ rating: -1, totalShipments: -1 });

  res.json(forwarders);
});

// @desc    Get forwarder by ID or slug (Public)
// @route   GET /api/forwarders/:id
// @access  Public
const getForwarderById = asyncHandler(async (req, res) => {
  const param = req.params.id;
  const isObjectId = param.match(/^[0-9a-fA-F]{24}$/);

  const forwarder = isObjectId
    ? await Forwarder.findById(param).populate('user', 'fullName email phone avatar')
    : await Forwarder.findOne({ slug: param }).populate('user', 'fullName email phone avatar');

  if (!forwarder) {
    res.status(404);
    throw new Error('Transitaire introuvable');
  }

  res.json(forwarder);
});

// @desc    Register as a new Forwarder (Private User)
// @route   POST /api/forwarders/register
// @access  Private
const registerForwarder = asyncHandler(async (req, res) => {
  const {
    companyName,
    description,
    phone,
    whatsapp,
    email,
    headquarters,
    warehouses,
    routes,
    services,
    businessRegistrationNumber,
    transportLicenseDoc,
    managerIdDoc
  } = req.body;

  // Vérifier si l'utilisateur a déjà un profil transitaire
  const existing = await Forwarder.findOne({ user: req.user._id });
  if (existing) {
    res.status(400);
    throw new Error('Vous avez déjà soumis un profil de transitaire.');
  }

  // Générer slug unique
  let baseSlug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  let slug = baseSlug;
  let counter = 1;
  while (await Forwarder.findOne({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Entrepôts par défaut si non spécifiés
  const defaultWarehouses = warehouses && warehouses.length > 0 ? warehouses : [
    {
      name: 'Entrepôt Guangzhou Central (Chine)',
      country: 'Chine',
      city: 'Guangzhou',
      address: 'Baiyun District, Shijing International Cargo Hub, Warehouse B4',
      postalCode: '510440',
      contactPerson: companyName,
      contactPhone: phone,
      markingCodePrefix: companyName.slice(0, 3).toUpperCase()
    }
  ];

  // Trajets par défaut si non spécifiés (Chine -> Cameroun)
  const defaultRoutes = routes && routes.length > 0 ? routes : [
    {
      originCountry: 'Chine',
      destinationCountry: 'Cameroun',
      destinationCity: 'Douala',
      mode: 'AIR_FREIGHT',
      pricePerKg: 8500, // 8 500 FCFA / kg
      minBillingAmount: 10000,
      estimatedDaysMin: 7,
      estimatedDaysMax: 12,
      includesCustoms: true
    },
    {
      originCountry: 'Chine',
      destinationCountry: 'Cameroun',
      destinationCity: 'Douala',
      mode: 'SEA_FREIGHT',
      pricePerKg: 2500,
      pricePerCbm: 380000, // 380 000 FCFA / m3
      minBillingAmount: 35000,
      estimatedDaysMin: 35,
      estimatedDaysMax: 50,
      includesCustoms: true
    }
  ];

  const forwarder = await Forwarder.create({
    user: req.user._id,
    companyName,
    slug,
    description: description || `Services de transit et fret international gérés par ${companyName}`,
    phone,
    whatsapp: whatsapp || phone,
    email: email || req.user.email,
    headquarters: headquarters || { country: 'Cameroun', city: 'Douala', address: 'Akwa' },
    warehouses: defaultWarehouses,
    routes: defaultRoutes,
    services: services || ['AIR_FREIGHT', 'SEA_FREIGHT', 'CUSTOMS_CLEARING', 'GROUPAGE'],
    businessRegistrationNumber: businessRegistrationNumber || '',
    transportLicenseDoc: transportLicenseDoc || '',
    managerIdDoc: managerIdDoc || '',
    kycStatus: (businessRegistrationNumber || transportLicenseDoc) ? 'PENDING' : 'NOT_SUBMITTED',
    status: 'APPROVED', // Actif pour démarrage immédiat (Phase 1)
    isVerified: true
  });

  // Mettre à jour l'utilisateur
  req.user.role = 'FORWARDER';
  req.user.forwarder = forwarder._id;
  await req.user.save();

  res.status(201).json({
    success: true,
    message: 'Compte transitaire créé et activé avec succès',
    forwarder
  });
});

// @desc    Update forwarder profile (Private Forwarder)
// @route   PUT /api/forwarders/my-profile
// @access  Private
const updateForwarderProfile = asyncHandler(async (req, res) => {
  const forwarder = await Forwarder.findOne({ user: req.user._id });
  if (!forwarder) {
    res.status(404);
    throw new Error('Profil transitaire non trouvé');
  }

  const {
    companyName,
    description,
    logo,
    phone,
    whatsapp,
    email,
    warehouses,
    routes,
    services,
    businessRegistrationNumber,
    transportLicenseDoc
  } = req.body;

  if (companyName) forwarder.companyName = companyName;
  if (description !== undefined) forwarder.description = description;
  if (logo) forwarder.logo = logo;
  if (phone) forwarder.phone = phone;
  if (whatsapp) forwarder.whatsapp = whatsapp;
  if (email) forwarder.email = email;
  if (warehouses) forwarder.warehouses = warehouses;
  if (routes) forwarder.routes = routes;
  if (services) forwarder.services = services;
  if (businessRegistrationNumber) forwarder.businessRegistrationNumber = businessRegistrationNumber;
  if (transportLicenseDoc) forwarder.transportLicenseDoc = transportLicenseDoc;

  await forwarder.save();

  res.json({
    success: true,
    message: 'Profil transitaire mis à jour avec succès',
    forwarder
  });
});

// @desc    Admin: Get all forwarders including pending/suspended
// @route   GET /api/forwarders/admin/all
// @access  Private/Admin
const adminGetForwarders = asyncHandler(async (req, res) => {
  const forwarders = await Forwarder.find()
    .populate('user', 'fullName email phone')
    .sort({ createdAt: -1 });

  res.json(forwarders);
});

// @desc    Admin: Approve or suspend forwarder
// @route   PUT /api/forwarders/admin/:id/status
// @access  Private/Admin
const adminUpdateForwarderStatus = asyncHandler(async (req, res) => {
  const { status, isVerified, commissionRate } = req.body;
  const forwarder = await Forwarder.findById(req.params.id);

  if (!forwarder) {
    res.status(404);
    throw new Error('Transitaire introuvable');
  }

  if (status) forwarder.status = status;
  if (isVerified !== undefined) forwarder.isVerified = isVerified;
  if (commissionRate !== undefined) forwarder.commissionRate = commissionRate;

  await forwarder.save();

  res.json({
    success: true,
    message: `Statut transitaire mis à jour : ${forwarder.status}`,
    forwarder
  });
});

module.exports = {
  getForwarders,
  getForwarderById,
  registerForwarder,
  updateForwarderProfile,
  adminGetForwarders,
  adminUpdateForwarderStatus
};
