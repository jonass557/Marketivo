const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// @desc    Get dashboard stats
// @route   GET /api/stats
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;

  const now = new Date();
  let startDate;
  
  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const orders = await Order.find({ createdAt: { $gte: startDate } });

  const totalRevenue = orders
    .filter(o => o.status === 'DELIVERED')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const ordersCount = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'PENDING').length;
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED').length;

  const productsCount = await Product.countDocuments();
  const usersCount = await User.countDocuments({ role: 'USER' });

  res.json({
    totalRevenue,
    ordersCount,
    pendingOrders,
    deliveredOrders,
    productsCount,
    usersCount,
    period
  });
});

// @desc    Get monthly sales chart data
// @route   GET /api/stats/chart
// @access  Private/Admin
const getChartData = asyncHandler(async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;

  const startOfYear = new Date(parseInt(year), 0, 1);
  const endOfYear = new Date(parseInt(year) + 1, 0, 1);

  const orders = await Order.find({
    createdAt: { $gte: startOfYear, $lt: endOfYear },
    status: { $in: ['CONFIRMED', 'DELIVERED'] }
  }).select('totalAmount createdAt status');

  const monthlyData = Array(12).fill(0);
  const monthlyOrders = Array(12).fill(0);
  const monthlyConfirmed = Array(12).fill(0);

  orders.forEach(order => {
    const month = order.createdAt.getMonth();
    monthlyData[month] += order.totalAmount;
    monthlyOrders[month] += 1;
    if (order.status === 'CONFIRMED') {
      monthlyConfirmed[month] += 1;
    }
  });

  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  const chartData = months.map((name, index) => ({
    name,
    ventes: monthlyData[index],
    commandes: monthlyOrders[index],
    confirmees: monthlyConfirmed[index]
  }));

  res.json(chartData);
});

// @desc    Search across orders, products, users
// @route   GET /api/stats/search
// @access  Private/Admin
const searchAll = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.json({ orders: [], products: [], users: [] });
  }

  const [orders, products, users] = await Promise.all([
    Order.find()
      .populate('user', 'fullName email')
      .limit(5)
      .lean(),
    Product.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    })
      .populate('category')
      .limit(5)
      .lean(),
    User.find({
      $or: [
        { fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    })
      .select('fullName email role')
      .limit(5)
      .lean()
  ]);

  res.json({
    orders: orders.map(o => ({ ...o, id: o._id })),
    products: products.map(p => ({ ...p, id: p._id })),
    users: users.map(u => ({ ...u, id: u._id }))
  });
});

module.exports = {
  getDashboardStats,
  getChartData,
  searchAll
};
