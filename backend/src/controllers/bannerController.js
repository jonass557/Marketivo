const asyncHandler = require('express-async-handler');
const Banner = require('../models/Banner');

// @desc    Get all banners
// @route   GET /api/banners
// @access  Public
const getBanners = asyncHandler(async (req, res) => {
  const { active } = req.query;
  
  let query = {};
  if (active === 'true') {
    query.active = true;
  }

  const banners = await Banner.find(query).sort({ createdAt: -1 }).lean();
  
  res.json(banners.map(b => ({ ...b, id: b._id })));
});

// @desc    Get banner by ID
// @route   GET /api/banners/:id
// @access  Public
const getBannerById = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id).lean();

  if (!banner) {
    res.status(404);
    throw new Error('Bannière non trouvée');
  }

  res.json({ ...banner, id: banner._id });
});

// @desc    Create a banner
// @route   POST /api/banners
// @access  Private/Admin
const createBanner = asyncHandler(async (req, res) => {
  const { title, imageUrl, link, active } = req.body;

  const banner = await Banner.create({
    title: title || '',
    imageUrl: imageUrl || '',
    link: link || '',
    active: active !== undefined ? active : true
  });

  res.status(201).json({ ...banner.toObject(), id: banner._id });
});

// @desc    Update a banner
// @route   PUT /api/banners/:id
// @access  Private/Admin
const updateBanner = asyncHandler(async (req, res) => {
  const { title, imageUrl, link, active } = req.body;

  const banner = await Banner.findById(req.params.id);

  if (!banner) {
    res.status(404);
    throw new Error('Bannière non trouvée');
  }

  if (title !== undefined) banner.title = title;
  if (imageUrl !== undefined) banner.imageUrl = imageUrl;
  if (link !== undefined) banner.link = link;
  if (active !== undefined) banner.active = active;

  await banner.save();

  res.json({ ...banner.toObject(), id: banner._id });
});

// @desc    Delete a banner
// @route   DELETE /api/banners/:id
// @access  Private/Admin
const deleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);

  if (!banner) {
    res.status(404);
    throw new Error('Bannière non trouvée');
  }

  await Banner.findByIdAndDelete(req.params.id);

  res.json({ message: 'Bannière supprimée' });
});

// @desc    Toggle banner active status
// @route   PUT /api/banners/:id/toggle
// @access  Private/Admin
const toggleBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);

  if (!banner) {
    res.status(404);
    throw new Error('Bannière non trouvée');
  }

  banner.active = !banner.active;
  await banner.save();

  res.json({ ...banner.toObject(), id: banner._id });
});

module.exports = {
  getBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBanner
};
