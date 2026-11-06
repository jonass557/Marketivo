const Coupon = require('../models/Coupon');
const Vendor = require('../models/Vendor');

// Valider un code promo (Utilisé par le client au panier / checkout)
exports.validateCoupon = async (req, res) => {
  try {
    const { code, cartTotal } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Veuillez saisir un code promo' });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: cleanCode, isActive: true });

    if (!coupon) {
      return res.status(404).json({ message: 'Code promo invalide ou expiré' });
    }

    const now = new Date();
    if (coupon.startDate && now < new Date(coupon.startDate)) {
      return res.status(400).json({ message: 'Ce code promo n\'est pas encore actif' });
    }
    if (coupon.expiryDate && now > new Date(coupon.expiryDate)) {
      return res.status(400).json({ message: 'Ce code promo a expiré' });
    }

    if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ message: 'Ce code promo a atteint sa limite d\'utilisation' });
    }

    const total = parseFloat(cartTotal) || 0;
    if (coupon.minOrderAmount > 0 && total < coupon.minOrderAmount) {
      return res.status(400).json({
        message: `Montant minimum d'achat requis de ${coupon.minOrderAmount.toLocaleString('fr-FR')} FCFA pour utiliser ce code`
      });
    }

    // Calcul de la remise
    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((total * coupon.discountValue) / 100);
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      // Montant fixe
      discountAmount = Math.min(coupon.discountValue, total);
    }

    res.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      newTotal: Math.max(0, total - discountAmount),
      message: `Code ${coupon.code} appliqué : -${discountAmount.toLocaleString('fr-FR')} FCFA`
    });
  } catch (error) {
    console.error('Erreur validation coupon:', error);
    res.status(500).json({ message: 'Erreur lors de la validation du code promo' });
  }
};

// Récupérer la liste des codes promo (Admin / Vendeur)
exports.getCoupons = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'VENDOR') {
      const vendor = await Vendor.findOne({ user: req.user._id });
      filter = { vendor: vendor?._id };
    }

    const coupons = await Coupon.find(filter).sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Créer un code promo (Admin ou Vendeur)
exports.createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      startDate,
      expiryDate,
      usageLimit
    } = req.body;

    if (!code || !discountValue) {
      return res.status(400).json({ message: 'Code et valeur de réduction requis' });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await Coupon.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({ message: 'Ce code promo existe déjà' });
    }

    let vendorId = null;
    if (req.user.role === 'VENDOR') {
      const vendor = await Vendor.findOne({ user: req.user._id });
      if (!vendor) return res.status(403).json({ message: 'Boutique vendeur non trouvée' });
      vendorId = vendor._id;
    }

    const coupon = new Coupon({
      code: cleanCode,
      description: description || '',
      discountType: discountType || 'PERCENTAGE',
      discountValue: parseFloat(discountValue),
      minOrderAmount: parseFloat(minOrderAmount) || 0,
      maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
      startDate: startDate || new Date(),
      expiryDate: expiryDate || null,
      usageLimit: parseInt(usageLimit) || 0,
      vendor: vendorId
    });

    await coupon.save();
    res.status(201).json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Supprimer ou désactiver un code promo
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Code promo non trouvé' });
    }

    // Vérifier les droits
    if (req.user.role === 'VENDOR') {
      const vendor = await Vendor.findOne({ user: req.user._id });
      if (!coupon.vendor || coupon.vendor.toString() !== vendor?._id?.toString()) {
        return res.status(403).json({ message: 'Non autorisé' });
      }
    }

    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Code promo supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
