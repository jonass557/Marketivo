const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true // ex: Entrepôt Guangzhou - Baiyun
  },
  country: {
    type: String,
    required: true // ex: Chine
  },
  city: {
    type: String,
    required: true // ex: Guangzhou
  },
  address: {
    type: String,
    required: true // ex: Building 4, Tonghe Industrial Zone, Baiyun District
  },
  postalCode: {
    type: String,
    default: ''
  },
  contactPerson: {
    type: String,
    default: ''
  },
  contactPhone: {
    type: String,
    required: true
  },
  markingCodePrefix: {
    type: String,
    default: 'MKV' // Préfixe de marquage sur les colis
  },
  operatingHours: {
    type: String,
    default: '09:00 - 18:00 (GMT+8)'
  }
});

const routeSchema = new mongoose.Schema({
  originCountry: {
    type: String,
    required: true // ex: Chine
  },
  destinationCountry: {
    type: String,
    required: true // ex: Cameroun
  },
  destinationCity: {
    type: String,
    required: true // ex: Douala
  },
  mode: {
    type: String,
    enum: ['AIR_FREIGHT', 'SEA_FREIGHT', 'EXPRESS'],
    required: true
  },
  pricePerKg: {
    type: Number,
    required: true // Prix par kg en XAF (ex: 8500 FCFA/kg pour aérien)
  },
  pricePerCbm: {
    type: Number,
    default: 0 // Prix par m3 en XAF (pour fret maritime, ex: 350000 FCFA/CBM)
  },
  minBillingAmount: {
    type: Number,
    default: 5000 // Facturation minimale
  },
  estimatedDaysMin: {
    type: Number,
    default: 7
  },
  estimatedDaysMax: {
    type: Number,
    default: 14
  },
  includesCustoms: {
    type: Boolean,
    default: true // Dédouanement inclus par défaut dans le tarif
  },
  customsFeeNotes: {
    type: String,
    default: 'Dédouanement et formalités portuaires inclus'
  }
});

const forwarderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  logo: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    required: true
  },
  whatsapp: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    required: true
  },
  headquarters: {
    country: { type: String, default: 'Cameroun' },
    city: { type: String, default: 'Douala' },
    address: { type: String, default: '' }
  },

  // Liste des entrepôts (Chine, Turquie, Douala...)
  warehouses: [warehouseSchema],

  // Trajets et tarifs au kg / m3
  routes: [routeSchema],

  // Services proposés
  services: [{
    type: String,
    enum: [
      'AIR_FREIGHT',         // Fret aérien
      'SEA_FREIGHT',         // Fret maritime
      'EXPRESS',             // Express rapide
      'GROUPAGE',            // Groupage de colis
      'CUSTOMS_CLEARING',    // Dédouanement
      'INSURANCE',           // Assurance marchandise
      'LOCAL_DELIVERY',      // Livraison à domicile au Cameroun
      'WAREHOUSE_STORAGE'    // Stockage en entrepôt
    ]
  }],

  // Vérification KYC entreprise & agrément
  kycStatus: {
    type: String,
    enum: ['NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED'],
    default: 'NOT_SUBMITTED'
  },
  businessRegistrationNumber: {
    type: String,
    default: '' // Numéro RCCM ou équivalent
  },
  transportLicenseDoc: {
    type: String,
    default: '' // Licence de transport / agrément douane
  },
  managerIdDoc: {
    type: String,
    default: '' // CNI / Passeport du gérant
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED'],
    default: 'PENDING'
  },

  // Évaluations & Stats
  rating: {
    type: Number,
    default: 5.0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  totalShipments: {
    type: Number,
    default: 0
  },
  completedShipments: {
    type: Number,
    default: 0
  },

  // Portefeuille & commissions
  walletBalance: {
    type: Number,
    default: 0
  },
  pendingBalance: {
    type: Number,
    default: 0
  },
  commissionRate: {
    type: Number,
    default: 5 // 5% commission plateforme
  }
}, {
  timestamps: true
});

forwarderSchema.index({ status: 1, isVerified: 1 });
forwarderSchema.index({ companyName: 'text', description: 'text' });

module.exports = mongoose.model('Forwarder', forwarderSchema);
