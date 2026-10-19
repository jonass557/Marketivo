const asyncHandler = require('express-async-handler');
const Partner = require('../models/Partner');

// @desc    Get active partners (public)
// @route   GET /api/partners
// @access  Public
const getPartners = asyncHandler(async (req, res) => {
  const partners = await Partner.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
  res.json(partners);
});

// @desc    Get all partners (admin)
// @route   GET /api/partners/admin
// @access  Private/Admin
const getAllPartnersAdmin = asyncHandler(async (req, res) => {
  const partners = await Partner.find().sort({ order: 1, createdAt: -1 });
  res.json(partners);
});

// @desc    Create partner
// @route   POST /api/partners
// @access  Private/Admin
const createPartner = asyncHandler(async (req, res) => {
  const { name, logo, website, order, isActive } = req.body;
  if (!name || !logo) {
    res.status(400);
    throw new Error('Nom et logo sont requis');
  }
  const partner = await Partner.create({ name, logo, website: website || '', order: order || 0, isActive: isActive !== false });
  res.status(201).json(partner);
});

// @desc    Update partner
// @route   PUT /api/partners/:id
// @access  Private/Admin
const updatePartner = asyncHandler(async (req, res) => {
  const partner = await Partner.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!partner) {
    res.status(404);
    throw new Error('Partenaire non trouvé');
  }
  res.json(partner);
});

// @desc    Delete partner
// @route   DELETE /api/partners/:id
// @access  Private/Admin
const deletePartner = asyncHandler(async (req, res) => {
  const partner = await Partner.findByIdAndDelete(req.params.id);
  if (!partner) {
    res.status(404);
    throw new Error('Partenaire non trouvé');
  }
  res.json({ message: 'Partenaire supprimé' });
});

module.exports = { getPartners, getAllPartnersAdmin, createPartner, updatePartner, deletePartner };
