const mongoose = require('mongoose');

const shipmentTrackingUpdateSchema = new mongoose.Schema({
  status: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: ''
  },
  note: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const threePartyMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['BUYER', 'VENDOR', 'FORWARDER', 'ADMIN'],
    required: true
  },
  senderName: {
    type: String,
    default: ''
  },
  text: {
    type: String,
    required: true
  },
  attachments: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const shipmentDocumentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'PACKING_LIST',          // Liste de colisage
      'COMMERCIAL_INVOICE',    // Facture commerciale
      'BILL_OF_LADING',        // Connaissement maritime (B/L)
      'AIR_WAYBILL',           // Lettre de transport aérien (LTA)
      'CUSTOMS_DECLARATION',   // Déclaration de douane
      'INSPECTION_PHOTO',      // Photos d'inspection
      'OTHER'
    ],
    default: 'OTHER'
  },
  url: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const shipmentFolderSchema = new mongoose.Schema({
  folderNumber: {
    type: String,
    required: true,
    unique: true
  },
  // Commande d'origine associée
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  // Acteurs de la relation à trois (Section 16.4)
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  forwarder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Forwarder',
    default: null
  },
  // Si l'acheteur a choisi son propre transitaire hors plateforme (Section 16.3)
  isExternalForwarder: {
    type: Boolean,
    default: false
  },
  externalForwarderDetails: {
    companyName: String,
    contactName: String,
    phone: String,
    warehouseAddress: String,
    instructions: String
  },

  // Entrepôt de destination Chine désigné
  selectedWarehouse: {
    name: String,
    country: String,
    city: String,
    address: String,
    contactPhone: String,
    markingCode: String // ex: MKV-GZ-4920 (code de marquage unique à inscrire sur le colis)
  },

  // Mode de transport choisi
  transportMode: {
    type: String,
    enum: ['AIR_FREIGHT', 'SEA_FREIGHT', 'EXPRESS'],
    default: 'AIR_FREIGHT'
  },

  // Articles à acheminer
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: String,
    quantity: Number,
    price: Number,
    image: String
  }],

  // Mesures & Inspection à l'entrepôt en Chine (Section 16.4)
  estimatedWeightKg: {
    type: Number,
    default: 1.0
  },
  actualWeightKg: {
    type: Number,
    default: 0
  },
  actualDimensionsCm: {
    length: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 }
  },
  actualVolumeCbm: {
    type: Number,
    default: 0
  },
  warehousePhotos: [String], // Photos du colis physique reçu à Guangzhou/Yiwu
  warehouseReceivedAt: Date,

  // Devis et facturation du transit (Section 16.6)
  quote: {
    initialEstimate: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'XAF' },
    platformCommission: { type: Number, default: 0 },
    isAcceptedByBuyer: { type: Boolean, default: false },
    acceptedAt: Date,
    additionalFees: [{
      reason: String,
      amount: Number,
      isApproved: { type: Boolean, default: false }
    }]
  },

  // Statut du paiement des frais de transit (séquestre)
  transitPaymentStatus: {
    type: String,
    enum: ['UNPAID', 'ESCROW_HELD', 'RELEASED_TO_FORWARDER', 'REFUNDED'],
    default: 'UNPAID'
  },
  transitPaymentMethod: {
    type: String,
    default: 'momo'
  },
  transitPaymentReference: String,

  // Les 14 Statuts stricts du Cahier des charges (Section 16.5)
  status: {
    type: String,
    enum: [
      'WAITING_FORWARDER_CHOICE',     // En attente de choix du transitaire
      'FORWARDER_SELECTED',           // Transitaire choisi
      'QUOTE_ACCEPTED',               // Devis accepté
      'IN_TRANSIT_TO_WAREHOUSE',      // Colis en route vers l'entrepôt en Chine
      'RECEIVED_AT_WAREHOUSE',        // Reçu à l'entrepôt (pesé + photographié)
      'PREPARING',                    // En préparation / emballage
      'SHIPPED',                      // Expédié vers l'Afrique
      'IN_TRANSIT',                   // En transit international (vol / bateau)
      'ARRIVED_DESTINATION',          // Arrivé au pays de destination (Cameroun)
      'CUSTOMS_CLEARING',             // En dédouanement
      'READY_FOR_PICKUP_OR_DELIVERY', // Prêt à livrer / à retirer au hub
      'DELIVERED',                    // Livré avec succès à l'acheteur
      'DISPUTED',                     // Litige en cours
      'CANCELLED'                     // Annulé
    ],
    default: 'FORWARDER_SELECTED'
  },

  // Numéro de suivi et transporteur international
  trackingNumber: {
    type: String,
    default: ''
  },
  trackingCarrier: {
    type: String,
    default: ''
  },
  trackingUpdates: [shipmentTrackingUpdateSchema],

  // Documents attachés au dossier
  documents: [shipmentDocumentSchema],

  // Messagerie à trois (Section 16.4)
  threePartyMessages: [threePartyMessageSchema],

  // Code de confirmation de remise colis (6 chiffres)
  deliveryConfirmationCode: {
    type: String,
    default: ''
  },
  deliveredAt: Date,

  // Destination finale de livraison
  destinationAddress: {
    fullName: String,
    phone: String,
    city: String,
    street: String,
    notes: String
  }
}, {
  timestamps: true
});

shipmentFolderSchema.pre('validate', function(next) {
  if (!this.folderNumber) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.folderNumber = `SHP-${dateStr}-${rand}`;
  }
  if (!this.deliveryConfirmationCode) {
    this.deliveryConfirmationCode = Math.floor(100000 + Math.random() * 900000).toString();
  }
  next();
});

shipmentFolderSchema.index({ buyer: 1, status: 1 });
shipmentFolderSchema.index({ forwarder: 1, status: 1 });
shipmentFolderSchema.index({ vendor: 1, status: 1 });

module.exports = mongoose.model('ShipmentFolder', shipmentFolderSchema);
