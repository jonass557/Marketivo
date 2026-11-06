const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const Settings = require('../models/Settings');
const UserSubscription = require('../models/UserSubscription');
const { sendOrderNotifications, generateWhatsAppLink } = require('../services/notificationService');
const { createNotification } = require('./notificationController');

// Configuration admin
const ADMIN_CONFIG = {
  email: process.env.ADMIN_EMAIL || 'admin@myshop.cm',
  whatsapp: process.env.ADMIN_WHATSAPP || '237600000000',
  phone: process.env.ADMIN_PHONE || '237600000000'
};

// @desc    Create new order (Hybride, Multi-vendeurs, Code promo, Sous-commandes)
// @route   POST /api/orders
// @access  Public / Private (Guest checkout autorisé pour digital)
const createOrder = asyncHandler(async (req, res) => {
  const {
    items,
    shippingAddress,
    city,
    phone,
    paymentMethod,
    shippingCost = 0,
    serviceFee = 0,
    couponCode = '',
    notes,
    guestName,
    guestEmail,
    guestPhone,
    deliveryMethod = 'STANDARD'
  } = req.body;

  if (!items || items.length === 0) {
    res.status(400);
    throw new Error('Aucun article dans la commande');
  }

  // Vérifier si l'utilisateur est connecté ou commande invité (pour produits digitaux)
  let userId = req.user ? req.user._id : null;
  let isGuest = false;

  if (!userId) {
    // Si invité, s'assurer qu'email et téléphone sont fournis
    if (!guestEmail && !guestPhone) {
      res.status(400);
      throw new Error('Veuillez fournir un email ou un numéro de téléphone pour recevoir vos accès');
    }
    isGuest = true;
    // Si un compte existe déjà avec cet email, on peut y rattacher
    if (guestEmail) {
      const existingUser = await User.findOne({ email: guestEmail.toLowerCase().trim() });
      if (existingUser) {
        userId = existingUser._id;
        isGuest = false;
      }
    }
  }

  // Calcul du sous-total
  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // Application éventuelle du code promo
  let discountAmount = 0;
  let appliedCoupon = null;
  if (couponCode && couponCode.trim()) {
    const cleanCode = couponCode.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: cleanCode, isActive: true });
    if (coupon) {
      const now = new Date();
      const isDateValid = (!coupon.startDate || now >= new Date(coupon.startDate)) &&
                          (!coupon.expiryDate || now <= new Date(coupon.expiryDate));
      const isUsageValid = coupon.usageLimit === 0 || coupon.usageCount < coupon.usageLimit;
      const isMinAmountValid = subtotal >= coupon.minOrderAmount;

      if (isDateValid && isUsageValid && isMinAmountValid) {
        if (coupon.discountType === 'PERCENTAGE') {
          discountAmount = Math.round((subtotal * coupon.discountValue) / 100);
          if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
            discountAmount = coupon.maxDiscountAmount;
          }
        } else {
          discountAmount = Math.min(coupon.discountValue, subtotal);
        }
        appliedCoupon = coupon;
        // Incrémenter l'utilisation du coupon
        coupon.usageCount = (coupon.usageCount || 0) + 1;
        await coupon.save();
      }
    }
  }

  // Enrichir les articles avec les métadonnées vendeur et digitales
  let totalCommission = 0;
  const enrichedItems = await Promise.all(items.map(async (item) => {
    const product = await Product.findById(item.productId).populate('vendor');
    let vendorId = null;
    let commission = 0;
    let commissionAmount = 0;

    let isItemDigital = false;
    let digitalType = '';
    let digitalFileUrl = '';
    let digitalFileName = '';
    let digitalAccessLink = '';
    let digitalInstructions = '';
    let downloadLimit = 0;

    if (product) {
      if (product.productType === 'DIGITAL') {
        isItemDigital = true;
        digitalType = product.digitalType || 'EBOOK';
        digitalFileUrl = product.digitalFileUrl || '';
        digitalFileName = product.digitalFileName || '';
        digitalAccessLink = product.digitalAccessLink || '';
        digitalInstructions = product.digitalInstructions || '';
        downloadLimit = product.downloadLimit || 0;
      }

      if (product.vendor) {
        vendorId = product.vendor._id;
        const vendor = await Vendor.findById(vendorId);

        // Déterminer le taux de commission
        if (vendor && vendor.commissionOverride !== null && vendor.commissionOverride !== undefined) {
          commission = vendor.commissionOverride;
        } else {
          const subscription = await UserSubscription.findOne({ vendor: vendorId, status: 'ACTIVE' });
          if (subscription) {
            commission = subscription.planSnapshot.commission || 0;
          }
        }

        commissionAmount = Math.round((item.price * item.quantity * commission) / 100);
        totalCommission += commissionAmount;
      }
    }

    return {
      product: item.productId,
      vendor: vendorId,
      name: item.name || product?.name || 'Article',
      quantity: item.quantity,
      price: item.price,
      commission,
      commissionAmount,
      productType: isItemDigital ? 'DIGITAL' : 'PHYSICAL',
      digitalType,
      digitalFileUrl,
      digitalFileName,
      digitalAccessLink,
      digitalInstructions,
      downloadLimit,
      downloadCount: 0,
      selectedVariant: item.selectedVariant || null
    };
  }));

  const hasDigitalItems = enrichedItems.some(i => i.productType === 'DIGITAL');
  const isDigitalOnly = enrichedItems.length > 0 && enrichedItems.every(i => i.productType === 'DIGITAL');
  const actualShippingCost = isDigitalOnly ? 0 : parseFloat(shippingCost) || 0;
  const actualServiceFee = parseFloat(serviceFee) || 0;
  const total = Math.max(0, subtotal + actualShippingCost + actualServiceFee - discountAmount);

  // Génération des numéros uniques
  const orderNumber = `CMD-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}${Math.floor(10 + Math.random() * 90)}`;
  const invoiceNumber = `FAC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  // Code unique de livraison à 6 chiffres (Cahier des charges 4.7)
  const deliveryCode = Math.floor(100000 + Math.random() * 900000).toString();

  // DÉCOUPAGE AUTOMATIQUE EN SOUS-COMMANDES PAR VENDEUR (Cahier des charges 4.5)
  const vendorGroups = {};
  for (const item of enrichedItems) {
    const key = item.vendor ? item.vendor.toString() : 'marketplace';
    if (!vendorGroups[key]) {
      vendorGroups[key] = [];
    }
    vendorGroups[key].push(item);
  }

  const subOrders = await Promise.all(Object.entries(vendorGroups).map(async ([vKey, vItems]) => {
    let vendorShopName = 'Marketivo Direct';
    let vId = null;
    if (vKey !== 'marketplace') {
      const vDoc = await Vendor.findById(vKey);
      if (vDoc) {
        vendorShopName = vDoc.shopName;
        vId = vDoc._id;
      }
    }
    const subTot = vItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
    const commAmt = vItems.reduce((acc, it) => acc + (it.commissionAmount || 0), 0);

    return {
      vendor: vId,
      vendorShopName,
      items: vItems,
      subTotal: subTot,
      shippingCost: isDigitalOnly ? 0 : Math.round(actualShippingCost / Object.keys(vendorGroups).length),
      commissionAmount: commAmt,
      status: 'PENDING',
      escrowStatus: 'HELD',
      deliveryCode
    };
  }));

  // Paramètres séquestre (Escrow)
  const settings = await Settings.findById('main');
  const escrowDays = settings?.escrowHoldDays || 3;
  const escrowReleaseDate = new Date(Date.now() + (escrowDays * 24 * 60 * 60 * 1000));

  // Créer la commande
  const order = await Order.create({
    orderNumber,
    invoiceNumber,
    user: userId,
    guestCheckout: {
      isGuest,
      name: guestName || (req.user ? req.user.fullName : 'Client Invité'),
      email: guestEmail || (req.user ? req.user.email : ''),
      phone: guestPhone || phone || (req.user ? req.user.phone : '')
    },
    items: enrichedItems,
    subOrders,
    subTotal: subtotal,
    shippingCost: actualShippingCost,
    serviceFee: actualServiceFee,
    discountAmount,
    couponCode: appliedCoupon ? appliedCoupon.code : '',
    totalAmount: total,
    shippingAddress: shippingAddress || (isDigitalOnly ? 'Livraison Numérique Instantanée' : 'Non spécifiée'),
    city: city || (isDigitalOnly ? 'Numérique' : ''),
    phone: phone || (req.user ? req.user.phone : guestPhone) || '',
    notes,
    paymentMethod: paymentMethod || 'cod',
    deliveryMethod,
    deliveryCode,
    status: 'PENDING',
    escrowStatus: 'HELD',
    escrowReleaseDate,
    totalCommission,
    hasDigitalItems,
    isDigitalOnly
  });

  // Populate pour la réponse
  const populatedOrder = await Order.findById(order._id)
    .populate('user', 'fullName email phone')
    .populate('items.product');

  const customer = {
    fullName: req.user ? req.user.fullName : (guestName || 'Client'),
    email: req.user ? req.user.email : (guestEmail || ''),
    phone: phone || (req.user ? req.user.phone : guestPhone) || ''
  };

  const orderItems = populatedOrder.items.map(item => ({
    name: item.name || item.product?.name || 'Produit',
    quantity: item.quantity,
    price: item.price
  }));

  const orderData = {
    ...populatedOrder.toObject(),
    id: populatedOrder._id,
    total: populatedOrder.totalAmount,
    subtotal,
    shippingCost: actualShippingCost,
    discountAmount,
    deliveryCode,
    paymentMethod: paymentMethod || 'cod'
  };

  // Envoyer notifications
  try {
    await sendOrderNotifications(orderData, customer, orderItems, ADMIN_CONFIG);
  } catch (error) {
    console.error('Erreur notifications commande:', error);
  }

  // Lien WhatsApp vendeur / admin
  const whatsappLink = generateWhatsAppLink(ADMIN_CONFIG.whatsapp, orderData, customer, orderItems);

  // Notification Admin
  await createNotification(
    'ORDER',
    `Nouvelle commande #${order.orderNumber} !`,
    `${customer.fullName} a passé une commande de ${new Intl.NumberFormat('fr-CM').format(order.totalAmount)} FCFA`,
    order._id
  );

  const orderResponse = { ...populatedOrder.toObject(), id: populatedOrder._id };

  // Émission WebSocket
  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit('newOrder', orderResponse);

    // Notifier chaque vendeur concerné
    for (const sub of subOrders) {
      if (sub.vendor) {
        try {
          const vDoc = await Vendor.findById(sub.vendor);
          if (vDoc) {
            vDoc.totalSales = (vDoc.totalSales || 0) + 1;
            vDoc.totalRevenue = (vDoc.totalRevenue || 0) + sub.subTotal;
            await vDoc.save();
            io.to(`user_${vDoc.user}`).emit('newOrder', orderResponse);
          }
        } catch (e) {
          console.error('Erreur notification vendeur:', e);
        }
      }
    }
  }

  res.status(201).json({
    order: orderResponse,
    deliveryCode,
    invoiceNumber,
    message: 'Commande créée avec succès',
    whatsappLink
  });
});

// @desc    Confirmer la livraison par code unique (Cahier des charges 4.7)
// @route   POST /api/orders/:id/confirm-delivery
// @access  Private (Vendeur, Admin ou Acheteur)
const confirmDelivery = asyncHandler(async (req, res) => {
  const { deliveryCode } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Commande introuvable');
  }

  if (order.status === 'DELIVERED') {
    return res.json({ message: 'Cette commande a déjà été confirmée comme livrée', order });
  }

  // Vérifier le code de livraison
  const cleanCode = (deliveryCode || '').trim();
  if (order.deliveryCode && order.deliveryCode !== cleanCode) {
    res.status(400);
    throw new Error('Code de livraison incorrect. Demandez le code à 6 chiffres à l\'acheteur.');
  }

  // Mettre à jour le statut global et libérer le séquestre
  order.status = 'DELIVERED';
  order.escrowStatus = 'RELEASED';

  // Mettre à jour les sous-commandes
  order.subOrders.forEach(sub => {
    sub.status = 'DELIVERED';
    sub.escrowStatus = 'RELEASED';
  });

  await order.save();

  // Notification WebSocket
  const io = req.app.get('io');
  if (io) {
    if (order.user) io.to(`user_${order.user}`).emit('orderUpdated', order);
    io.to('admin').emit('orderUpdated', order);
  }

  res.json({
    success: true,
    message: 'Livraison confirmée avec succès ! Les fonds ont été libérés (Escrow Released).',
    order
  });
});

// @desc    Remboursement total ou partiel par l'administrateur (Cahier des charges 4.6)
// @route   POST /api/orders/admin/:id/refund
// @access  Private/Admin
const adminRefundOrder = asyncHandler(async (req, res) => {
  const { amount, reason } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Commande non trouvée');
  }

  const refundAmt = parseFloat(amount) || order.totalAmount;

  order.refund = {
    isRefunded: true,
    amount: refundAmt,
    reason: reason || 'Remboursement accordé par l\'administrateur',
    refundedAt: new Date(),
    refundedBy: req.user._id
  };

  order.status = 'CANCELLED';
  order.escrowStatus = 'REFUNDED';
  order.subOrders.forEach(sub => {
    sub.escrowStatus = 'REFUNDED';
    sub.status = 'CANCELLED';
  });

  await order.save();

  const io = req.app.get('io');
  if (io) {
    if (order.user) io.to(`user_${order.user}`).emit('orderUpdated', order);
    io.to('admin').emit('orderUpdated', order);
  }

  res.json({
    success: true,
    message: `Remboursement de ${refundAmt.toLocaleString('fr-FR')} FCFA enregistré avec succès`,
    order
  });
});

// @desc    Générer la facture / reçu PDF / JSON
// @route   GET /api/orders/:id/invoice
// @access  Private (Acheteur, Vendeur ou Admin)
const getOrderInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'fullName email phone')
    .populate('items.product')
    .populate('items.vendor', 'shopName email phone address city country');

  if (!order) {
    res.status(404);
    throw new Error('Commande non trouvée');
  }

  // Vérification de sécurité
  const isOwner = req.user && order.user && order.user._id.toString() === req.user._id.toString();
  const isAdmin = req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN');
  const isVendor = req.user && order.items.some(i => i.vendor && i.vendor.toString() === req.user._id.toString());

  if (!isOwner && !isAdmin && !isVendor) {
    res.status(403);
    throw new Error('Non autorisé à consulter cette facture');
  }

  const settings = await Settings.findById('main');

  const invoiceData = {
    invoiceNumber: order.invoiceNumber || `FAC-${order._id.toString().slice(-8).toUpperCase()}`,
    orderNumber: order.orderNumber || `CMD-${order._id.toString().slice(-8).toUpperCase()}`,
    date: order.createdAt,
    store: {
      name: settings?.storeName || 'Marketivo',
      logo: settings?.storeLogo || '',
      email: settings?.storeEmail || 'contact@marketivo.com',
      phone: settings?.storePhone || '+237 600 000 000',
      address: settings?.storeAddress || 'Douala, Cameroun'
    },
    customer: {
      name: order.guestCheckout?.name || order.user?.fullName || 'Client',
      email: order.guestCheckout?.email || order.user?.email || '',
      phone: order.phone || order.guestCheckout?.phone || order.user?.phone || '',
      address: order.shippingAddress,
      city: order.city
    },
    items: order.items.map(item => ({
      name: item.name || item.product?.name || 'Produit',
      type: item.productType,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity
    })),
    subtotal: order.subTotal || order.items.reduce((acc, i) => acc + (i.price * i.quantity), 0),
    shippingCost: order.shippingCost || 0,
    serviceFee: order.serviceFee || 0,
    discountAmount: order.discountAmount || 0,
    couponCode: order.couponCode || '',
    total: order.totalAmount,
    currency: settings?.currencySymbol || 'FCFA',
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    deliveryCode: order.deliveryCode,
    isDelivered: order.status === 'DELIVERED'
  };

  res.json(invoiceData);
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

  // Vérifier l'accès
  const isOwner = order.user && order.user._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
  if (!isOwner && !isAdmin) {
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

  const validStatuses = [
    'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED',
    'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'
  ];
  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error(`Statut invalide: ${status}`);
  }

  const updateFields = { status };
  if (status === 'DELIVERED') {
    updateFields.escrowStatus = 'RELEASED';
  } else if (status === 'CANCELLED' || status === 'RETURNED') {
    updateFields.escrowStatus = 'REFUNDED';
  }

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    updateFields,
    { new: true }
  )
    .populate('user', 'fullName email phone')
    .populate('items.product');

  if (!order) {
    res.status(404);
    throw new Error('Commande non trouvée');
  }

  const orderData = { ...order.toObject(), id: order._id };

  const io = req.app.get('io');
  if (io) {
    if (order.user) io.to(`user_${order.user._id}`).emit('orderUpdated', orderData);
    io.to('admin').emit('orderUpdated', orderData);
  }

  const statusMessages = {
    CONFIRMED: 'Votre commande a été confirmée !',
    PROCESSING: 'Votre commande est en cours de préparation.',
    SHIPPED: 'Votre commande a été expédiée.',
    OUT_FOR_DELIVERY: 'Votre livreur est en route vers votre adresse !',
    DELIVERED: 'Votre commande a été livrée !',
    CANCELLED: 'Votre commande a été annulée.',
    RETURNED: 'Votre commande a été retournée.'
  };

  if (statusMessages[status] && order.user) {
    await createNotification(
      'ORDER',
      statusMessages[status],
      `Commande #${order.orderNumber || order._id.toString().slice(-8).toUpperCase()}`,
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

// @desc    Get user's purchased digital products
// @route   GET /api/orders/my-digital-downloads
// @access  Private
const getMyDigitalDownloads = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    user: req.user._id,
    $or: [
      { paymentStatus: 'PAID' },
      { status: 'DELIVERED' },
      { status: 'CONFIRMED' }
    ]
  }).populate('items.product').sort({ createdAt: -1 });

  const downloads = [];

  orders.forEach(order => {
    order.items.forEach(item => {
      const isDigital = item.productType === 'DIGITAL' || item.product?.productType === 'DIGITAL';
      if (isDigital) {
        const prod = item.product || {};
        const prodId = (prod._id || item.product || '').toString();

        downloads.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          orderDate: order.createdAt,
          paymentStatus: order.paymentStatus,
          orderStatus: order.status,
          productId: prodId,
          name: prod.name || item.name || 'Produit Digital',
          image: prod.images?.[0] || prod.image || '',
          price: item.price,
          quantity: item.quantity,
          digitalType: item.digitalType || prod.digitalType || 'EBOOK',
          downloadUrl: item.digitalFileUrl || prod.digitalFileUrl || '',
          fileName: item.digitalFileName || prod.digitalFileName || `${prod.name || 'produit'}.pdf`,
          accessLink: item.digitalAccessLink || prod.digitalAccessLink || '',
          instructions: item.digitalInstructions || prod.digitalInstructions || '',
          courseModules: prod.courseModules || [],
          coachingDetails: prod.coachingDetails || null,
          externalProduct: prod.externalProduct || null,
          licenseKey: item.licenseKey || ''
        });
      }
    });
  });

  res.json(downloads);
});

module.exports = {
  createOrder,
  confirmDelivery,
  adminRefundOrder,
  getOrderInvoice,
  getMyOrders,
  getMyDigitalDownloads,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  deleteOrder
};
