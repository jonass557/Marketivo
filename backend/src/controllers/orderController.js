const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const UserSubscription = require('../models/UserSubscription');
const { sendOrderNotifications, generateWhatsAppLink } = require('../services/notificationService');
const { createNotification } = require('./notificationController');

// Configuration admin
const ADMIN_CONFIG = {
  email: process.env.ADMIN_EMAIL || 'admin@myshop.cm',
  whatsapp: process.env.ADMIN_WHATSAPP || '237600000000',
  phone: process.env.ADMIN_PHONE || '237600000000'
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const {
    items,
    shippingAddress,
    city,
    phone,
    paymentMethod,
    shippingCost = 0,
    notes
  } = req.body;

  if (!items || items.length === 0) {
    res.status(400);
    throw new Error('Aucun article dans la commande');
  }

  // Calculer le total et les commissions par vendeur
  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = subtotal + shippingCost;

  // Enrichir les items avec les informations vendeur et commission
  let totalCommission = 0;
  const enrichedItems = await Promise.all(items.map(async (item) => {
    const product = await Product.findById(item.productId).populate('vendor');
    let vendorId = null;
    let commission = 0;
    let commissionAmount = 0;

    if (product && product.vendor) {
      vendorId = product.vendor._id;
      const vendor = await Vendor.findById(vendorId);

      // Déterminer le taux de commission
      if (vendor && vendor.commissionOverride !== null && vendor.commissionOverride !== undefined) {
        commission = vendor.commissionOverride;
      } else {
        // Utiliser la commission de l'abonnement actif
        const subscription = await UserSubscription.findOne({ vendor: vendorId, status: 'ACTIVE' });
        if (subscription) {
          commission = subscription.planSnapshot.commission || 0;
        }
      }

      commissionAmount = Math.round((item.price * item.quantity * commission) / 100);
      totalCommission += commissionAmount;
    }

    return {
      product: item.productId,
      vendor: vendorId,
      quantity: item.quantity,
      price: item.price,
      commission,
      commissionAmount
    };
  }));

  // Créer la commande
  const order = await Order.create({
    user: req.user._id,
    totalAmount: total,
    shippingAddress,
    city,
    phone,
    paymentMethod: paymentMethod || 'cod',
    notes,
    status: 'PENDING',
    items: enrichedItems,
    totalCommission
  });

  // Populate pour la réponse
  const populatedOrder = await Order.findById(order._id)
    .populate('user', 'fullName email phone')
    .populate('items.product');

  // Préparer les données pour la notification
  const customer = {
    fullName: req.user.fullName,
    email: req.user.email,
    phone: phone || req.user.phone
  };

  const orderItems = populatedOrder.items.map(item => ({
    name: item.product?.name || 'Produit',
    quantity: item.quantity,
    price: item.price
  }));

  const orderData = {
    ...populatedOrder.toObject(),
    id: populatedOrder._id,
    total: populatedOrder.totalAmount,
    subtotal,
    shippingCost,
    paymentMethod: paymentMethod || 'cash'
  };

  // Envoyer les notifications à l'admin
  try {
    const notificationResults = await sendOrderNotifications(orderData, customer, orderItems, ADMIN_CONFIG);
    console.log('📧 Notifications envoyées:', notificationResults);
  } catch (error) {
    console.error('Erreur notifications:', error);
  }

  // Générer le lien WhatsApp
  const whatsappLink = generateWhatsAppLink(ADMIN_CONFIG.whatsapp, orderData, customer, orderItems);

  // Créer une notification pour l'admin
  await createNotification(
    'ORDER',
    'Nouvelle commande !',
    `${customer.fullName} a passé une commande de ${new Intl.NumberFormat('fr-CM').format(order.totalAmount)} XAF`,
    order._id
  );

  const orderResponse = { ...populatedOrder.toObject(), id: populatedOrder._id };

  // Émettre l'événement WebSocket pour notifier les admins
  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit('newOrder', orderResponse);

    // Notifier chaque vendeur concerné par la commande
    const vendorIds = new Set();
    for (const item of enrichedItems) {
      if (item.vendor) vendorIds.add(item.vendor.toString());
    }
    for (const vid of vendorIds) {
      try {
        const vendorDoc = await Vendor.findById(vid);
        if (vendorDoc) {
          // Mettre à jour les stats du vendeur
          vendorDoc.totalSales = (vendorDoc.totalSales || 0) + 1;
          const vendorTotal = enrichedItems
            .filter(i => i.vendor && i.vendor.toString() === vid)
            .reduce((sum, i) => sum + (i.price * i.quantity), 0);
          vendorDoc.totalRevenue = (vendorDoc.totalRevenue || 0) + vendorTotal;
          await vendorDoc.save();

          // Notifier via WebSocket
          io.to(`user_${vendorDoc.user}`).emit('newOrder', orderResponse);
        }
      } catch (e) { console.error('Erreur notification vendeur:', e); }
    }
  }

  res.status(201).json({
    order: orderResponse,
    message: 'Commande créée avec succès',
    whatsappLink
  });
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate('items.product')
    .sort({ createdAt: -1 })
    .lean();

  const ordersWithId = orders.map(o => ({ ...o, id: o._id }));
  res.json(ordersWithId);
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'fullName email phone')
    .populate({
      path: 'items.product',
      populate: { path: 'category' }
    })
    .lean();

  if (!order) {
    res.status(404);
    throw new Error('Commande non trouvée');
  }

  // Vérifier que l'utilisateur a accès à cette commande
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
    res.status(403);
    throw new Error('Non autorisé');
  }

  res.json({ ...order, id: order._id });
});

// @desc    Get all orders (admin)
// @route   GET /api/orders
// @access  Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = status ? { status } : {};
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const orders = await Order.find(query)
    .populate('user', 'fullName email phone')
    .populate({
      path: 'items.product',
      populate: { path: 'category' }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const total = await Order.countDocuments(query);

  const ordersWithId = orders.map(o => ({ ...o, id: o._id }));

  res.json({
    orders: ordersWithId,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    total
  });
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const validStatuses = ['PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error(`Statut invalide: ${status}`);
  }

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  )
    .populate('user', 'fullName email phone')
    .populate('items.product');

  if (!order) {
    res.status(404);
    throw new Error('Commande non trouvée');
  }

  const orderData = { ...order.toObject(), id: order._id };

  // Émettre l'événement WebSocket au client
  const io = req.app.get('io');
  if (io) {
    // Notifier le client propriétaire de la commande
    io.to(`user_${order.user._id}`).emit('orderUpdated', orderData);
    // Notifier tous les admins
    io.to('admin').emit('orderUpdated', orderData);
  }

  // Créer une notification pour le client
  const statusMessages = {
    CONFIRMED: 'Votre commande a été confirmée !',
    DELIVERED: 'Votre commande a été livrée !',
    CANCELLED: 'Votre commande a été annulée.'
  };

  if (statusMessages[status]) {
    await createNotification(
      'ORDER',
      statusMessages[status],
      `Commande #${order._id.toString().slice(-8).toUpperCase()}`,
      order._id,
      order.user._id
    );
  }

  res.json(orderData);
});

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private/Admin
const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndDelete(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Commande non trouvée');
  }

  res.json({ message: 'Commande supprimée' });
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  deleteOrder
};
