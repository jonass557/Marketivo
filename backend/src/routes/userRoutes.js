const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  getUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getUserStats,
  getProfile,
  updateProfile,
  updatePassword
} = require('../controllers/userController');

// Routes utilisateur connecté
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, updatePassword);

// Routes admin
router.get('/', protect, admin, getUsers);
router.get('/stats', protect, admin, getUserStats);
router.get('/:id', protect, admin, getUserById);

// Gestion des rôles et suppression (admin uniquement)
router.put('/:id/role', protect, admin, updateUserRole);
router.delete('/:id', protect, admin, deleteUser);

module.exports = router;
