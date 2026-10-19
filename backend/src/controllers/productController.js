const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Review = require('../models/Review');
const Vendor = require('../models/Vendor');
const UserSubscription = require('../models/UserSubscription');

// Fonction pour générer un slug
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const { category, search, minPrice, maxPrice, sort, page = 1, limit = 20 } = req.query;

  let query = {};

  // Filtre par catégorie
  if (category) {
    const cat = await Category.findOne({ slug: category });
    if (cat) {
      query.category = cat._id;
    }
  }

  // Filtre par recherche
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Filtre par prix
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  // Options de tri
  let sortOption = { createdAt: -1 };
  if (sort === 'price-low') sortOption = { price: 1 };
  else if (sort === 'price-high') sortOption = { price: -1 };
  else if (sort === 'name') sortOption = { name: 1 };
  else if (sort === 'popular') sortOption = { isPopular: -1 };

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Filtre par vendeur
  if (req.query.vendor) {
    query.vendor = req.query.vendor;
  }

  const products = await Product.find(query)
    .populate('category')
    .populate('vendor', 'shopName slug logo rating isOnline')
    .sort(sortOption)
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  // Calculer la note moyenne pour chaque produit
  const productsWithRating = await Promise.all(products.map(async (product) => {
    const reviews = await Review.find({ product: product._id });
    const reviewCount = reviews.length;
    const rating = reviewCount > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount 
      : 0;
    
    return {
      ...product,
      id: product._id,
      rating: Math.round(rating * 10) / 10,
      reviewCount
    };
  }));

  const total = await Product.countDocuments(query);

  res.json({
    products: productsWithRating,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    total
  });
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Chercher par ID ou par slug
  let product;
  
  // Vérifier si c'est un ObjectId valide
  const isValidObjectId = id.match(/^[0-9a-fA-F]{24}$/);
  
  if (isValidObjectId) {
    product = await Product.findById(id).populate('category').populate('vendor', 'shopName slug logo rating isOnline user').lean();
  }
  
  if (!product) {
    product = await Product.findOne({ slug: id }).populate('category').populate('vendor', 'shopName slug logo rating isOnline user').lean();
  }

  if (!product) {
    res.status(404);
    throw new Error('Produit non trouvé');
  }

  // Récupérer les reviews
  const reviews = await Review.find({ product: product._id }).populate('user', 'fullName');
  
  res.json({ ...product, id: product._id, reviews });
});

// @desc    Create product
// @route   POST /api/products
// @access  Private/Admin or Vendor
const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, oldPrice, brand, size, stock, categoryId, images, isPopular, isAffiliate, affiliateUrl } = req.body;

  console.log('Création produit:', { name, categoryId, price });

  if (!name || !description || !price || !categoryId) {
    res.status(400);
    throw new Error('Veuillez remplir tous les champs requis');
  }

  // Vérifier que la catégorie existe
  const category = await Category.findById(categoryId);

  if (!category) {
    res.status(400);
    throw new Error('Catégorie non trouvée');
  }

  // Déterminer le vendeur si l'utilisateur est un VENDOR
  let vendorId = null;
  let visibilityScore = 0;

  if (req.user.role === 'VENDOR') {
    const vendor = await Vendor.findOne({ user: req.user._id });
    if (!vendor) {
      res.status(400);
      throw new Error('Profil vendeur non trouvé');
    }
    if (vendor.status !== 'APPROVED') {
      res.status(400);
      throw new Error('Votre boutique doit être approuvée pour ajouter des produits');
    }
    vendorId = vendor._id;
    visibilityScore = vendor.visibilityScore || 0;

    // Vérifier la limite de produits selon l'abonnement
    const subscription = await UserSubscription.findOne({ vendor: vendor._id, status: 'ACTIVE' }).populate('plan');
    if (subscription && subscription.planSnapshot.maxProducts > 0) {
      const currentCount = await Product.countDocuments({ vendor: vendor._id });
      if (currentCount >= subscription.planSnapshot.maxProducts) {
        res.status(400);
        throw new Error(`Limite de ${subscription.planSnapshot.maxProducts} produits atteinte. Mettez à niveau votre abonnement.`);
      }
    }
  }

  // Générer un slug unique
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;
  
  while (await Product.findOne({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  try {
    const product = await Product.create({
      name,
      slug,
      description,
      price: parseFloat(price),
      oldPrice: oldPrice ? parseFloat(oldPrice) : null,
      brand: brand || null,
      size: size || null,
      stock: isAffiliate ? 999 : (parseInt(stock) || 0),
      category: categoryId,
      images: images || [],
      isPopular: isPopular || false,
      isAffiliate: isAffiliate || false,
      affiliateUrl: affiliateUrl || null,
      vendor: vendorId,
      visibilityScore,
      isApproved: req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN' ? true : true
    });

    const populatedProduct = await Product.findById(product._id).populate('category').populate('vendor', 'shopName slug');

    console.log('Produit créé avec succès:', product._id);
    res.status(201).json({ ...populatedProduct.toObject(), id: populatedProduct._id });
  } catch (error) {
    console.error('Erreur création produit:', error);
    res.status(500);
    throw new Error('Erreur lors de la création du produit: ' + error.message);
  }
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, price, oldPrice, brand, size, stock, categoryId, images, isPopular, isAffiliate, affiliateUrl } = req.body;

  const existingProduct = await Product.findById(id);

  if (!existingProduct) {
    res.status(404);
    throw new Error('Produit non trouvé');
  }

  // Vérifier que le vendeur est propriétaire du produit
  if (req.user.role === 'VENDOR') {
    const vendor = await Vendor.findOne({ user: req.user._id });
    if (!vendor || !existingProduct.vendor || existingProduct.vendor.toString() !== vendor._id.toString()) {
      res.status(403);
      throw new Error('Vous ne pouvez modifier que vos propres produits');
    }
  }

  // Générer un nouveau slug si le nom a changé
  let slug = existingProduct.slug;
  if (name && name !== existingProduct.name) {
    slug = generateSlug(name);
    const slugExists = await Product.findOne({ slug, _id: { $ne: id } });
    if (slugExists) {
      slug = `${slug}-${Date.now()}`;
    }
  }

  existingProduct.name = name || existingProduct.name;
  existingProduct.slug = slug;
  existingProduct.description = description !== undefined ? description : existingProduct.description;
  existingProduct.price = price ? parseFloat(price) : existingProduct.price;
  existingProduct.oldPrice = oldPrice !== undefined ? (oldPrice ? parseFloat(oldPrice) : null) : existingProduct.oldPrice;
  existingProduct.brand = brand !== undefined ? brand : existingProduct.brand;
  existingProduct.size = size !== undefined ? size : existingProduct.size;
  existingProduct.stock = stock !== undefined ? parseInt(stock) : existingProduct.stock;
  existingProduct.category = categoryId || existingProduct.category;
  existingProduct.images = images !== undefined ? images : existingProduct.images;
  existingProduct.isPopular = isPopular !== undefined ? isPopular : existingProduct.isPopular;
  existingProduct.isAffiliate = isAffiliate !== undefined ? isAffiliate : existingProduct.isAffiliate;
  existingProduct.affiliateUrl = affiliateUrl !== undefined ? affiliateUrl : existingProduct.affiliateUrl;

  await existingProduct.save();
  
  const product = await Product.findById(id).populate('category');
  res.json({ ...product.toObject(), id: product._id });
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);

  if (!product) {
    res.status(404);
    throw new Error('Produit non trouvé');
  }

  // Vérifier que le vendeur est propriétaire du produit
  if (req.user.role === 'VENDOR') {
    const vendor = await Vendor.findOne({ user: req.user._id });
    if (!vendor || !product.vendor || product.vendor.toString() !== vendor._id.toString()) {
      res.status(403);
      throw new Error('Vous ne pouvez supprimer que vos propres produits');
    }
  }

  // Supprimer les reviews associées
  await Review.deleteMany({ product: id });

  // Supprimer le produit
  await Product.findByIdAndDelete(id);

  res.json({ message: 'Produit supprimé avec succès' });
});

// @desc    Toggle product popular status
// @route   PUT /api/products/:id/popular
// @access  Private/Admin
const togglePopular = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);

  if (!product) {
    res.status(404);
    throw new Error('Produit non trouvé');
  }

  product.isPopular = !product.isPopular;
  await product.save();

  const updatedProduct = await Product.findById(id).populate('category');
  res.json({ ...updatedProduct.toObject(), id: updatedProduct._id });
});

// @desc    Import products from CSV
// @route   POST /api/products/import
// @access  Private/Admin
const importProducts = asyncHandler(async (req, res) => {
  const { products } = req.body;

  if (!products || !Array.isArray(products) || products.length === 0) {
    res.status(400);
    throw new Error('Aucun produit à importer');
  }

  let imported = 0;
  let errors = [];

  for (const productData of products) {
    try {
      // Find or create category
      let category = await Category.findOne({ 
        name: { $regex: new RegExp(`^${productData.categoryName}$`, 'i') }
      });

      if (!category) {
        // Create category if it doesn't exist
        const categorySlug = generateSlug(productData.categoryName || 'sans-categorie');
        category = await Category.create({
          name: productData.categoryName || 'Sans catégorie',
          slug: categorySlug + '-' + Date.now()
        });
      }

      // Generate unique slug
      const baseSlug = generateSlug(productData.name);
      let slug = baseSlug;
      let counter = 1;
      while (await Product.findOne({ slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Create product
      await Product.create({
        name: productData.name,
        slug,
        description: productData.description || '',
        price: productData.price || 0,
        oldPrice: productData.oldPrice || null,
        stock: productData.stock || 0,
        brand: productData.brand || null,
        size: productData.size || null,
        isPopular: productData.isPopular || false,
        category: category._id,
        images: []
      });

      imported++;
    } catch (error) {
      errors.push(`${productData.name}: ${error.message}`);
    }
  }

  res.json({
    message: `${imported} produit(s) importé(s) avec succès`,
    imported,
    errors: errors.length > 0 ? errors : undefined
  });
});

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  togglePopular,
  importProducts
};
