const asyncHandler = require('express-async-handler');
const ShipmentFolder = require('../models/ShipmentFolder');
const Order = require('../models/Order');
const Forwarder = require('../models/Forwarder');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { createNotification } = require('./notificationController');

// @desc    Créer un dossier d'expédition tripartite (Section 16.3 & 16.4)
// @route   POST /api/shipments
// @access  Private (Acheteur ou Admin)
const createShipmentFolder = asyncHandler(async (req, res) => {
  const {
    orderId,
    forwarderId,
    isExternalForwarder,
    externalForwarderDetails,
    transportMode,
    destinationAddress
  } = req.body;

  const order = await Order.findById(orderId).populate('items.product items.vendor');
  if (!order) {
    res.status(404);
    throw new Error('Commande associée introuvable');
  }

  // Vérifier propriétaire de la commande ou admin
  const isOwner = order.user && order.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
  if (!isOwner && !isAdmin) {
    res.status(403);
    throw new Error('Non autorisé à créer une expédition pour cette commande');
  }

  // Vérifier s'il existe déjà un dossier pour cette commande
  const existing = await ShipmentFolder.findOne({ order: orderId });
  if (existing) {
    return res.json({
      success: true,
      message: 'Un dossier d\'expédition existe déjà pour cette commande',
      shipment: existing
    });
  }

  let forwarder = null;
  let selectedWarehouse = {};
  let initialEstimate = 0;

  if (!isExternalForwarder && forwarderId) {
    forwarder = await Forwarder.findById(forwarderId);
    if (!forwarder) {
      res.status(404);
      throw new Error('Transitaire partenaire introuvable');
    }

    // Sélectionner l'entrepôt Chine par défaut (ex: Guangzhou)
    const wh = (forwarder.warehouses && forwarder.warehouses.length > 0)
      ? forwarder.warehouses[0]
      : null;

    const markingPrefix = wh?.markingCodePrefix || forwarder.companyName.slice(0, 3).toUpperCase();
    const orderRef = order.orderNumber || order._id.toString().slice(-6).toUpperCase();

    selectedWarehouse = {
      name: wh?.name || `${forwarder.companyName} - Hub Guangzhou`,
      country: wh?.country || 'Chine',
      city: wh?.city || 'Guangzhou',
      address: wh?.address || 'Baiyun Cargo Logistics Park',
      contactPhone: wh?.contactPhone || forwarder.phone,
      markingCode: `${markingPrefix}-GZ-${orderRef}`
    };

    // Estimer les frais selon le mode
    const mode = transportMode || 'AIR_FREIGHT';
    const route = forwarder.routes.find(r => r.mode === mode) || forwarder.routes[0];
    if (route) {
      const estimatedWeight = order.items.reduce((acc, it) => acc + (it.product?.weight || 1) * it.quantity, 0) || 1;
      initialEstimate = Math.max(route.minBillingAmount || 0, Math.round(estimatedWeight * (route.pricePerKg || 8500)));
    }
  } else if (isExternalForwarder) {
    selectedWarehouse = {
      name: externalForwarderDetails?.companyName || 'Transitaire Externe',
      country: 'Chine',
      city: 'Chine',
      address: externalForwarderDetails?.warehouseAddress || 'Adresse fournie par l\'acheteur',
      contactPhone: externalForwarderDetails?.phone || '',
      markingCode: `EXT-${order.orderNumber || order._id.toString().slice(-6).toUpperCase()}`
    };
  }

  // Déterminer le vendeur principal pour le dossier
  const firstVendorItem = order.items.find(i => i.vendor);
  const vendorId = firstVendorItem ? (firstVendorItem.vendor._id || firstVendorItem.vendor) : null;

  // Calcul du poids estimé total
  const totalWeight = order.items.reduce((acc, it) => acc + (it.product?.weight || 1) * it.quantity, 0) || 1;

  const shipment = await ShipmentFolder.create({
    order: order._id,
    buyer: order.user || req.user._id,
    vendor: vendorId,
    forwarder: forwarder ? forwarder._id : null,
    isExternalForwarder: !!isExternalForwarder,
    externalForwarderDetails: isExternalForwarder ? externalForwarderDetails : undefined,
    selectedWarehouse,
    transportMode: transportMode || 'AIR_FREIGHT',
    items: order.items.map(item => ({
      product: item.product?._id || item.product,
      name: item.name || item.product?.name || 'Article',
      quantity: item.quantity,
      price: item.price,
      image: item.product?.images?.[0] || item.product?.image || ''
    })),
    estimatedWeightKg: totalWeight,
    quote: {
      initialEstimate,
      finalAmount: initialEstimate,
      currency: 'XAF',
      platformCommission: Math.round(initialEstimate * 0.05),
      isAcceptedByBuyer: false
    },
    status: isExternalForwarder ? 'FORWARDER_SELECTED' : (forwarder ? 'FORWARDER_SELECTED' : 'WAITING_FORWARDER_CHOICE'),
    destinationAddress: destinationAddress || {
      fullName: order.shippingAddress?.fullName || req.user.fullName,
      phone: order.phone || req.user.phone,
      city: order.city || 'Douala',
      street: order.shippingAddress?.street || order.shippingAddress || 'Akwa',
      notes: ''
    },
    trackingUpdates: [{
      status: 'FORWARDER_SELECTED',
      location: selectedWarehouse.city || 'Chine',
      note: `Dossier créé. Colis attendu à l'entrepôt avec le code de marquage : ${selectedWarehouse.markingCode}`,
      timestamp: new Date()
    }]
  });

  // Notifier via Socket.io
  const io = req.app.get('io');
  if (io) {
    if (forwarder && forwarder.user) {
      io.to(`user_${forwarder.user}`).emit('newShipmentAssigned', shipment);
    }
    if (vendorId) {
      io.to(`user_${vendorId}`).emit('newShipmentForVendor', shipment);
    }
    io.to('admin').emit('newShipmentCreated', shipment);
  }

  res.status(201).json({
    success: true,
    message: 'Dossier d\'expédition créé avec succès',
    shipment
  });
});

// @desc    Obtenir mes dossiers d'expédition (selon rôle: Acheteur, Vendeur, Transitaire, Admin)
// @route   GET /api/shipments/my-shipments
// @access  Private
const getMyShipments = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const user = req.user;

  const query = {};

  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    // Admin voit tout
  } else if (user.role === 'FORWARDER' || user.forwarder) {
    const fId = user.forwarder?._id || user.forwarder;
    query.forwarder = fId;
  } else if (user.role === 'VENDOR' || user.vendor) {
    const vId = user.vendor?._id || user.vendor;
    query.vendor = vId;
  } else {
    // Acheteur
    query.buyer = user._id;
  }

  if (status) {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { folderNumber: { $regex: search, $options: 'i' } },
      { 'selectedWarehouse.markingCode': { $regex: search, $options: 'i' } },
      { trackingNumber: { $regex: search, $options: 'i' } }
    ];
  }

  const shipments = await ShipmentFolder.find(query)
    .populate('order', 'orderNumber totalAmount paymentStatus createdAt')
    .populate('forwarder', 'companyName phone email logo')
    .populate('buyer', 'fullName email phone')
    .populate('vendor', 'shopName email phone')
    .sort({ createdAt: -1 });

  res.json(shipments);
});

// @desc    Obtenir un dossier par son ID ou son folderNumber (Section 16.4)
// @route   GET /api/shipments/:id
// @access  Private
const getShipmentById = asyncHandler(async (req, res) => {
  const param = req.params.id;
  const isObjectId = param.match(/^[0-9a-fA-F]{24}$/);

  const query = isObjectId ? { _id: param } : { folderNumber: param };

  const shipment = await ShipmentFolder.findOne(query)
    .populate('order')
    .populate('forwarder')
    .populate('buyer', 'fullName email phone avatar')
    .populate('vendor', 'shopName email phone logo')
    .populate('items.product', 'name images sku weight')
    .populate('threePartyMessages.sender', 'fullName avatar role');

  if (!shipment) {
    res.status(404);
    throw new Error('Dossier d\'expédition introuvable');
  }

  // Vérifier droits d'accès
  const userId = req.user._id.toString();
  const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
  const isBuyer = shipment.buyer && shipment.buyer._id.toString() === userId;
  const isVendor = shipment.vendor && (
    (shipment.vendor.user && shipment.vendor.user.toString() === userId) ||
    (req.user.vendor && shipment.vendor._id.toString() === req.user.vendor.toString())
  );
  const isForwarder = shipment.forwarder && (
    (shipment.forwarder.user && shipment.forwarder.user.toString() === userId) ||
    (req.user.forwarder && shipment.forwarder._id.toString() === req.user.forwarder.toString())
  );

  if (!isAdmin && !isBuyer && !isVendor && !isForwarder) {
    res.status(403);
    throw new Error('Non autorisé à consulter ce dossier d\'expédition');
  }

  res.json(shipment);
});

// @desc    Enregistrer la réception du colis à l'entrepôt Chine (Pesée, Volume, Photos) (Section 16.4)
// @route   PUT /api/shipments/:id/warehouse-intake
// @access  Private (Transitaire ou Admin)
const updateWarehouseIntake = asyncHandler(async (req, res) => {
  const {
    actualWeightKg,
    lengthCm,
    widthCm,
    heightCm,
    warehousePhotos,
    finalQuoteAmount,
    note
  } = req.body;

  const shipment = await ShipmentFolder.findById(req.params.id);
  if (!shipment) {
    res.status(404);
    throw new Error('Dossier d\'expédition introuvable');
  }

  const weight = parseFloat(actualWeightKg) || shipment.estimatedWeightKg;
  const length = parseFloat(lengthCm) || 0;
  const width = parseFloat(widthCm) || 0;
  const height = parseFloat(heightCm) || 0;

  // Calcul du volume m3 = (L * W * H) / 1 000 000
  const volumeCbm = (length && width && height) ? ((length * width * height) / 1000000) : 0;
  // Poids volumétrique aérien standard = (L * W * H) / 5000 (Section 15.4)
  const volumetricWeightKg = (length && width && height) ? ((length * width * height) / 5000) : 0;

  shipment.actualWeightKg = weight;
  shipment.actualDimensionsCm = { length, width, height };
  shipment.actualVolumeCbm = Math.round(volumeCbm * 1000) / 1000;
  shipment.warehouseReceivedAt = new Date();

  if (warehousePhotos && Array.isArray(warehousePhotos) && warehousePhotos.length > 0) {
    shipment.warehousePhotos = [...new Set([...shipment.warehousePhotos, ...warehousePhotos])];
  }

  // Mise à jour du devis si spécifié
  if (finalQuoteAmount) {
    const finalAmt = Math.round(parseFloat(finalQuoteAmount));
    shipment.quote.finalAmount = finalAmt;
    shipment.quote.platformCommission = Math.round(finalAmt * 0.05); // 5% plateforme
    shipment.quote.isAcceptedByBuyer = false; // Requiert validation acheteur sur le devis final si différent
  }

  shipment.status = 'RECEIVED_AT_WAREHOUSE';

  const billingWeight = Math.max(weight, volumetricWeightKg);
  const intakeNote = note || `Colis inspecté à l'entrepôt. Poids réel: ${weight} kg (Volumétrique: ${Math.round(volumetricWeightKg * 10) / 10} kg, Facturé: ${Math.round(billingWeight * 10) / 10} kg). Devis final: ${shipment.quote.finalAmount.toLocaleString('fr-FR')} FCFA.`;

  shipment.trackingUpdates.push({
    status: 'RECEIVED_AT_WAREHOUSE',
    location: shipment.selectedWarehouse?.city || 'Guangzhou',
    note: intakeNote,
    timestamp: new Date()
  });

  await shipment.save();

  // Émettre notification temps réel
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${shipment.buyer}`).emit('shipmentUpdated', shipment);
    io.to(`shipment_${shipment._id}`).emit('shipmentUpdated', shipment);
  }

  await createNotification(
    'SHIPMENT',
    `Votre colis a été réceptionné à l'entrepôt international ! Photos et pesée finale disponibles.`,
    `Dossier ${shipment.folderNumber}`,
    shipment._id,
    shipment.buyer
  );

  res.json({
    success: true,
    message: 'Réception à l\'entrepôt enregistrée avec succès',
    shipment
  });
});

// @desc    L'acheteur valide le devis et bloque le paiement en séquestre (Section 16.6)
// @route   PUT /api/shipments/:id/accept-quote
// @access  Private (Acheteur)
const acceptShipmentQuote = asyncHandler(async (req, res) => {
  const { paymentMethod, paymentReference } = req.body;

  const shipment = await ShipmentFolder.findById(req.params.id);
  if (!shipment) {
    res.status(404);
    throw new Error('Dossier d\'expédition introuvable');
  }

  if (shipment.buyer.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
    res.status(403);
    throw new Error('Non autorisé à valider ce devis');
  }

  shipment.quote.isAcceptedByBuyer = true;
  shipment.quote.acceptedAt = new Date();
  shipment.transitPaymentStatus = 'ESCROW_HELD';
  shipment.transitPaymentMethod = paymentMethod || 'momo';
  if (paymentReference) {
    shipment.transitPaymentReference = paymentReference;
  }
  shipment.status = 'QUOTE_ACCEPTED';

  shipment.trackingUpdates.push({
    status: 'QUOTE_ACCEPTED',
    location: shipment.selectedWarehouse?.city || 'Chine',
    note: `Devis de transit accepté par l'acheteur (${shipment.quote.finalAmount.toLocaleString('fr-FR')} FCFA séquestrés en toute sécurité). Préparation à l'expédition.`,
    timestamp: new Date()
  });

  await shipment.save();

  const io = req.app.get('io');
  if (io) {
    if (shipment.forwarder) {
      io.to(`shipment_${shipment._id}`).emit('shipmentQuoteAccepted', shipment);
    }
  }

  res.json({
    success: true,
    message: 'Devis validé ! Les frais de transit sont sécurisés en séquestre (Escrow).',
    shipment
  });
});

// @desc    Mettre à jour le statut du dossier d'expédition (Les 14 statuts) (Section 16.5)
// @route   PUT /api/shipments/:id/status
// @access  Private (Transitaire ou Admin)
const updateShipmentStatus = asyncHandler(async (req, res) => {
  const {
    status,
    location,
    note,
    trackingNumber,
    trackingCarrier
  } = req.body;

  const validStatuses = [
    'WAITING_FORWARDER_CHOICE',
    'FORWARDER_SELECTED',
    'QUOTE_ACCEPTED',
    'IN_TRANSIT_TO_WAREHOUSE',
    'RECEIVED_AT_WAREHOUSE',
    'PREPARING',
    'SHIPPED',
    'IN_TRANSIT',
    'ARRIVED_DESTINATION',
    'CUSTOMS_CLEARING',
    'READY_FOR_PICKUP_OR_DELIVERY',
    'DELIVERED',
    'DISPUTED',
    'CANCELLED'
  ];

  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error(`Statut invalide: ${status}`);
  }

  const shipment = await ShipmentFolder.findById(req.params.id);
  if (!shipment) {
    res.status(404);
    throw new Error('Dossier d\'expédition introuvable');
  }

  shipment.status = status;
  if (trackingNumber) shipment.trackingNumber = trackingNumber;
  if (trackingCarrier) shipment.trackingCarrier = trackingCarrier;

  const defaultNotes = {
    PREPARING: 'Colis groupé et préparé pour embarquement international.',
    SHIPPED: 'Colis expédié par fret international.',
    IN_TRANSIT: 'En transit aérien / maritime vers le Cameroun.',
    ARRIVED_DESTINATION: 'Arrivé à destination (Port / Aéroport de Douala).',
    CUSTOMS_CLEARING: 'En cours de dédouanement par le transitaire partenaire.',
    READY_FOR_PICKUP_OR_DELIVERY: 'Dédouanement terminé ! Disponible au hub de retrait ou en cours de livraison finale.',
    DELIVERED: 'Colis remis à l\'acheteur en mains propres.',
    DISPUTED: 'Dossier placé en litige.',
    CANCELLED: 'Dossier d\'expédition annulé.'
  };

  shipment.trackingUpdates.push({
    status,
    location: location || (status.includes('DESTINATION') ? 'Douala, Cameroun' : 'Chine'),
    note: note || defaultNotes[status] || `Mise à jour du statut : ${status}`,
    timestamp: new Date()
  });

  await shipment.save();

  const io = req.app.get('io');
  if (io) {
    io.to(`shipment_${shipment._id}`).emit('shipmentStatusUpdated', {
      shipmentId: shipment._id,
      status,
      trackingUpdates: shipment.trackingUpdates
    });
    io.to(`user_${shipment.buyer}`).emit('shipmentUpdated', shipment);
  }

  await createNotification(
    'SHIPMENT',
    `Mise à jour expédition (${shipment.folderNumber}) : ${note || defaultNotes[status] || status}`,
    `Suivi Transitaire`,
    shipment._id,
    shipment.buyer
  );

  res.json({
    success: true,
    message: `Statut mis à jour vers ${status}`,
    shipment
  });
});

// @desc    Messagerie tripartite in-dossier (Section 16.4)
// @route   POST /api/shipments/:id/messages
// @access  Private
const addThreePartyMessage = asyncHandler(async (req, res) => {
  const { text, attachments } = req.body;

  if (!text || !text.trim()) {
    res.status(400);
    throw new Error('Le message ne peut pas être vide');
  }

  const shipment = await ShipmentFolder.findById(req.params.id);
  if (!shipment) {
    res.status(404);
    throw new Error('Dossier d\'expédition introuvable');
  }

  const userId = req.user._id.toString();
  let senderRole = 'BUYER';

  if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
    senderRole = 'ADMIN';
  } else if (shipment.forwarder && (req.user.role === 'FORWARDER' || req.user.forwarder)) {
    senderRole = 'FORWARDER';
  } else if (shipment.vendor && (req.user.role === 'VENDOR' || req.user.vendor)) {
    senderRole = 'VENDOR';
  }

  const newMessage = {
    sender: req.user._id,
    senderRole,
    senderName: req.user.fullName || (senderRole === 'FORWARDER' ? 'Transitaire' : 'Participant'),
    text: text.trim(),
    attachments: attachments || [],
    createdAt: new Date()
  };

  shipment.threePartyMessages.push(newMessage);
  await shipment.save();

  // Diffusion temps réel Socket.io dans la room du dossier
  const io = req.app.get('io');
  if (io) {
    io.to(`shipment_${shipment._id}`).emit('threePartyMessageReceived', {
      shipmentId: shipment._id,
      message: newMessage
    });
  }

  res.status(201).json({
    success: true,
    message: newMessage
  });
});

// @desc    Ajouter un document au dossier (Packing List, Connaissement B/L, LTA, Facture) (Section 16.4)
// @route   POST /api/shipments/:id/documents
// @access  Private
const uploadShipmentDocument = asyncHandler(async (req, res) => {
  const { name, type, url } = req.body;

  if (!name || !url) {
    res.status(400);
    throw new Error('Le nom et l\'URL du document sont obligatoires');
  }

  const shipment = await ShipmentFolder.findById(req.params.id);
  if (!shipment) {
    res.status(404);
    throw new Error('Dossier d\'expédition introuvable');
  }

  const doc = {
    name,
    type: type || 'OTHER',
    url,
    uploadedBy: req.user._id,
    createdAt: new Date()
  };

  shipment.documents.push(doc);
  await shipment.save();

  res.status(201).json({
    success: true,
    message: 'Document ajouté au dossier d\'expédition',
    document: doc
  });
});

// @desc    Confirmer la livraison et libérer le séquestre au transitaire via Code à 6 chiffres (Section 16.6)
// @route   POST /api/shipments/:id/confirm-delivery
// @access  Private (Transitaire, Acheteur ou Admin)
const confirmShipmentDelivery = asyncHandler(async (req, res) => {
  const { deliveryCode } = req.body;

  const shipment = await ShipmentFolder.findById(req.params.id);
  if (!shipment) {
    res.status(404);
    throw new Error('Dossier d\'expédition introuvable');
  }

  const isBuyer = shipment.buyer.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

  // Si c'est le transitaire qui valide la livraison, le code secret fourni par l'acheteur est obligatoire
  if (!isBuyer && !isAdmin) {
    if (!deliveryCode || deliveryCode.trim() !== shipment.deliveryConfirmationCode) {
      res.status(400);
      throw new Error('Code de confirmation de livraison incorrect. Demandez le code à 6 chiffres à l\'acheteur.');
    }
  }

  shipment.status = 'DELIVERED';
  shipment.deliveredAt = new Date();
  shipment.transitPaymentStatus = 'RELEASED_TO_FORWARDER';

  // Créditer le wallet du transitaire
  if (shipment.forwarder) {
    const netPayout = Math.max(0, shipment.quote.finalAmount - (shipment.quote.platformCommission || 0));
    await Forwarder.findByIdAndUpdate(shipment.forwarder, {
      $inc: {
        'wallet.balance': netPayout,
        'wallet.totalEarned': netPayout,
        totalShipments: 1
      }
    });
  }

  shipment.trackingUpdates.push({
    status: 'DELIVERED',
    location: shipment.destinationAddress?.city || 'Douala, Cameroun',
    note: `Colis remis avec succès au destinataire final. Frais de transit débloqués et versés au transitaire (Escrow Released).`,
    timestamp: new Date()
  });

  await shipment.save();

  const io = req.app.get('io');
  if (io) {
    io.to(`shipment_${shipment._id}`).emit('shipmentDelivered', shipment);
    io.to(`user_${shipment.buyer}`).emit('shipmentUpdated', shipment);
  }

  await createNotification(
    'SHIPMENT',
    `Livraison terminée pour le dossier ${shipment.folderNumber}. Merci d'avoir utilisé notre réseau de transitaires partenaires !`,
    `Livraison Confirmée`,
    shipment._id,
    shipment.buyer
  );

  res.json({
    success: true,
    message: 'Livraison confirmée avec succès ! Les fonds du transit ont été libérés au transitaire.',
    shipment
  });
});

module.exports = {
  createShipmentFolder,
  getMyShipments,
  getShipmentById,
  updateWarehouseIntake,
  acceptShipmentQuote,
  updateShipmentStatus,
  addThreePartyMessage,
  uploadShipmentDocument,
  confirmShipmentDelivery
};
