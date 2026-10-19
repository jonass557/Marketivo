const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');
const Product = require('../models/Product');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 }).lean();

  // Add product count to each category
  const categoriesWithCount = await Promise.all(categories.map(async (cat) => {
    const productCount = await Product.countDocuments({ category: cat._id });
    return {
      ...cat,
      id: cat._id,
      productCount
    };
  }));

  res.json(categoriesWithCount);
});

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id).lean();

  if (!category) {
    res.status(404);
    throw new Error('Catégorie non trouvée');
  }

  const products = await Product.find({ category: category._id });
  res.json({ ...category, id: category._id, products });
});

// @desc    Get category by slug
// @route   GET /api/categories/slug/:slug
// @access  Public
const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug }).lean();

  if (!category) {
    res.status(404);
    throw new Error('Catégorie non trouvée');
  }

  const products = await Product.find({ category: category._id });
  res.json({ ...category, id: category._id, products });
});

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = asyncHandler(async (req, res) => {
  const { name, description, image } = req.body;

  if (!name) {
    res.status(400);
    throw new Error('Le nom de la catégorie est requis');
  }

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  // Check if category with same name or slug exists
  const existingCategory = await Category.findOne({
    $or: [{ name }, { slug }]
  });

  if (existingCategory) {
    res.status(400);
    throw new Error('Une catégorie avec ce nom existe déjà');
  }

  const category = await Category.create({
    name,
    slug,
    description: description || null,
    image: image || null
  });

  res.status(201).json({ ...category.toObject(), id: category._id });
});

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = asyncHandler(async (req, res) => {
  const { name, description, image } = req.body;

  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error('Catégorie non trouvée');
  }

  // Generate new slug if name changed
  let slug = category.slug;
  if (name && name !== category.name) {
    slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug already exists for another category
    const existingCategory = await Category.findOne({
      slug,
      _id: { $ne: req.params.id }
    });

    if (existingCategory) {
      slug = `${slug}-${Date.now()}`;
    }
  }

  category.name = name || category.name;
  category.slug = slug;
  category.description = description !== undefined ? description : category.description;
  category.image = image !== undefined ? image : category.image;

  await category.save();

  res.json({ ...category.toObject(), id: category._id });
});

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error('Catégorie non trouvée');
  }

  const productCount = await Product.countDocuments({ category: category._id });

  if (productCount > 0) {
    res.status(400);
    throw new Error('Impossible de supprimer une catégorie contenant des produits');
  }

  await Category.findByIdAndDelete(req.params.id);

  res.json({ message: 'Catégorie supprimée' });
});

module.exports = {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
};
