const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const generateToken = require('../utils/generateToken');
const nodemailer = require('nodemailer');

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const trimmedEmail = email?.trim().toLowerCase();
  const trimmedPassword = password?.trim();

  const user = await User.findOne({ email: trimmedEmail });

  let passwordMatch = false;
  if (user && trimmedPassword) {
    passwordMatch = await bcrypt.compare(trimmedPassword, user.password);
    // Tolérance pour première lettre en majuscule automatique sur mobile
    if (!passwordMatch && trimmedPassword.length > 0) {
      passwordMatch = await bcrypt.compare(trimmedPassword.toLowerCase(), user.password);
    }
  }

  if (user && passwordMatch) {
    const response = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    };

    // Si c'est un vendeur, ajouter les infos de la boutique
    if (user.role === 'VENDOR' && user.vendor) {
      const vendor = await Vendor.findById(user.vendor);
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
  } else {
    res.status(401);
    throw new Error('Email ou mot de passe incorrect');
  }
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;

  console.log('Tentative d\'inscription:', { fullName, email });

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      throw new Error('Cet utilisateur existe déjà');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
    });

    if (user) {
      console.log('Utilisateur créé avec succès:', user._id);
      res.status(201).json({
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      throw new Error('Données utilisateur invalides');
    }
  } catch (error) {
    console.error('Erreur inscription:', error);
    throw error;
  }
});

// @desc    Login admin
// @route   POST /api/auth/admin/login
// @access  Public
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const trimmedEmail = email?.trim().toLowerCase();
  const trimmedPassword = password?.trim();

  if (!trimmedEmail || !trimmedPassword) {
    res.status(400);
    throw new Error('Veuillez fournir un identifiant et un mot de passe');
  }

  // Support des alias admin, admin@marketivo.com, admin@myshop.cm
  let user;
  if (trimmedEmail === 'admin' || trimmedEmail === 'administrator') {
    user = await User.findOne({
      $or: [
        { email: 'admin@marketivo.com' },
        { email: 'admin@myshop.cm' },
        { role: 'ADMIN' },
        { role: 'SUPER_ADMIN' }
      ]
    });
  } else {
    user = await User.findOne({ email: trimmedEmail });
  }

  // Si non trouvé directement et l'email contient "admin", fallback vers un administrateur existant
  if (!user && (trimmedEmail.includes('admin') || trimmedEmail.includes('marketivo') || trimmedEmail.includes('myshop'))) {
    user = await User.findOne({ $or: [{ role: 'ADMIN' }, { role: 'SUPER_ADMIN' }] });
  }

  if (user) {
    let passwordMatch = await bcrypt.compare(trimmedPassword, user.password);

    // Fallback pour majuscule automatique sur smartphones (ex: Admin123 au lieu de admin123)
    if (!passwordMatch && trimmedPassword.length > 0) {
      passwordMatch = await bcrypt.compare(trimmedPassword.toLowerCase(), user.password);
    }

    if (passwordMatch) {
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        res.status(403);
        throw new Error('Non autorisé comme admin');
      }
      res.json({
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
      return;
    }
  }

  res.status(401);
  throw new Error('Email ou mot de passe incorrect');
});

// @desc    Forgot password - send reset email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error('Aucun compte associé à cet email');
  }

  // Générer un token de réinitialisation
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 heure

  // Sauvegarder le token dans la base de données
  user.resetToken = resetToken;
  user.resetTokenExpiry = resetTokenExpiry;
  await user.save();

  // Configurer le transporteur email
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Réinitialisation de votre mot de passe - MyShop',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">Réinitialisation de mot de passe</h2>
        <p>Bonjour ${user.fullName},</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">
          Réinitialiser mon mot de passe
        </a>
        <p style="color: #666; font-size: 14px;">Ce lien expire dans 1 heure.</p>
        <p style="color: #666; font-size: 14px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Email de réinitialisation envoyé' });
  } catch (error) {
    console.error('Erreur envoi email:', error);
    res.status(500);
    throw new Error('Erreur lors de l\'envoi de l\'email');
  }
});

// @desc    Reset password with token
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: new Date() }
  });

  if (!user) {
    res.status(400);
    throw new Error('Token invalide ou expiré');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  user.password = hashedPassword;
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  res.json({ message: 'Mot de passe réinitialisé avec succès' });
});

module.exports = { loginUser, registerUser, loginAdmin, forgotPassword, resetPassword };
