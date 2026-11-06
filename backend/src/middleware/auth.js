const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select('email role fullName vendor');

      if (!user) {
        return res.status(401).json({ message: 'Utilisateur non trouvé' });
      }

      req.user = {
        _id: user._id,
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        vendor: user.vendor || null
      };

      return next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Non autorisé, token invalide' });
    }
  }

  return res.status(401).json({ message: 'Non autorisé, pas de token' });
};

// Middleware d'authentification optionnelle (pour commande invité ou panier)
const optionalProtect = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('email role fullName vendor');
      if (user) {
        req.user = {
          _id: user._id,
          id: user._id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          vendor: user.vendor || null
        };
      }
    } catch (error) {
      // Ignorer l'erreur pour laisser passer en invité
      req.user = null;
    }
  }
  return next();
};

const admin = (req, res, next) => {
  if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
    next();
  } else {
    res.status(403).json({ message: 'Accès administrateur requis' });
  }
};

const vendor = (req, res, next) => {
  if (req.user && (req.user.role === 'VENDOR' || req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
    next();
  } else {
    res.status(403).json({ message: 'Accès vendeur requis' });
  }
};

const vendorOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'VENDOR' || req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
    next();
  } else {
    res.status(403).json({ message: 'Accès vendeur ou administrateur requis' });
  }
};

module.exports = { protect, optionalProtect, admin, vendor, vendorOrAdmin };
