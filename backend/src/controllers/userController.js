const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Order = require('../models/Order');
const Review = require('../models/Review');
const AdminRequest = require('../models/AdminRequest');
const Vendor = require('../models/Vendor');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  const { page = 1, limit = 20, search = '', role = '' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let query = {};
  
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  if (role && role !== 'ALL') {
    query.role = role;
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('email fullName role phone address createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    User.countDocuments(query)
  ]);

  // Add order count
  const usersWithCount = await Promise.all(users.map(async (user) => {
    const orderCount = await Order.countDocuments({ user: user._id });
    return { ...user, id: user._id, _count: { orders: orderCount } };
  }));

  res.json({
    users: usersWithCount,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit))
  });
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('email fullName role phone address createdAt')
    .lean();

  if (!user) {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }

  const orders = await Order.find({ user: user._id })
    .select('totalAmount status createdAt')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const [orderCount, reviewCount] = await Promise.all([
    Order.countDocuments({ user: user._id }),
    Review.countDocuments({ user: user._id })
  ]);

  res.json({
    ...user,
    id: user._id,
    orders: orders.map(o => ({ ...o, id: o._id })),
    _count: { orders: orderCount, reviews: reviewCount }
  });
});

// @desc    Update user role (Admin only)
// @route   PUT /api/users/:id/role
// @access  Private/Admin
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const { id } = req.params;

  const validRoles = ['USER', 'ADMIN'];
  if (!validRoles.includes(role)) {
    res.status(400);
    throw new Error('Rôle invalide. Les rôles autorisés sont: USER, ADMIN');
  }

  const user = await User.findById(id);

  if (!user) {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }

  if (user._id.toString() === req.user._id.toString()) {
    res.status(403);
    throw new Error('Vous ne pouvez pas modifier votre propre rôle');
  }

  user.role = role;
  await user.save();

  res.json({
    message: `Le rôle de ${user.fullName} a été changé en ${role === 'ADMIN' ? 'Administrateur' : 'Client'}`,
    user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role }
  });
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }

  if (user.role === 'ADMIN') {
    res.status(403);
    throw new Error('Impossible de supprimer un autre administrateur');
  }

  if (user._id.toString() === req.user._id.toString()) {
    res.status(403);
    throw new Error('Vous ne pouvez pas supprimer votre propre compte');
  }

  // Supprimer les données associées
  await Review.deleteMany({ user: id });
  await Order.deleteMany({ user: id });
  await AdminRequest.deleteMany({ user: id });
  await User.findByIdAndDelete(id);

  res.json({
    message: `L'utilisateur ${user.fullName} a été supprimé avec succès`
  });
});

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private/Admin
const getUserStats = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  
  const [totalUsers, admins, clients] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'ADMIN' }),
    User.countDocuments({ role: 'USER' })
  ]);

  res.json({
    total: totalUsers,
    admins,
    clients
  });
});

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password').lean();

  if (!user) {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }

  const response = {
    id: user._id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone || '',
    address: user.address || '',
    role: user.role
  };

  // Ajouter les infos vendeur si applicable
  if (user.role === 'VENDOR' && user.vendor) {
    const vendor = await Vendor.findById(user.vendor).lean();
    if (vendor) {
      response.vendor = {
        id: vendor._id,
        shopName: vendor.shopName,
        slug: vendor.slug,
        status: vendor.status
      };
    }
  }

  res.json(response);
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone, address } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }

  if (fullName !== undefined) user.fullName = fullName;
  if (phone !== undefined) user.phone = phone;
  if (address !== undefined) user.address = address;

  await user.save();

  res.json({
    id: user._id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    address: user.address,
    role: user.role,
    message: 'Profil mis à jour avec succès'
  });
});

// @desc    Update user password
// @route   PUT /api/users/password
// @access  Private
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Veuillez fournir le mot de passe actuel et le nouveau mot de passe');
  }

  if (newPassword.length < 6) {
    res.status(400);
    throw new Error('Le nouveau mot de passe doit contenir au moins 6 caractères');
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);

  if (!isMatch) {
    res.status(400);
    throw new Error('Mot de passe actuel incorrect');
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();

  res.json({ message: 'Mot de passe mis à jour avec succès' });
});

module.exports = {
  getUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getUserStats,
  getProfile,
  updateProfile,
  updatePassword
};
