const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Review = require('../models/Review');
const Vendor = require('../models/Vendor');
const Settings = require('../models/Settings');
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

// @desc    Suggestions de recherche avec autocomplétion (Cahier des charges 4.4)
// @route   GET /api/products/search/suggestions
// @access  Public
const getSearchSuggestions = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.json({ suggestions: [], products: [], categories: [] });
  }

  const queryRegex = new RegExp(q.trim(), 'i');

  const [products, categories] = await Promise.all([
    Product.find({
      $or: [{ name: queryRegex }, { description: queryRegex }],
      moderationStatus: { $ne: 'REJECTED' }
    })
      .select('name slug price images productType digitalType category')
      .populate('category', 'name slug')
      .limit(6)
      .lean(),
    Category.find({ name: queryRegex })
      .select('name slug')
      .limit(4)
      .lean()
  ]);

  const suggestions = [
    ...products.map(p => ({
      type: 'product',
      id: p._id,
      title: p.name,
      slug: p.slug,
      price: p.price,
      image: p.images?.[0] || '',
      productType: p.productType,
      digitalType: p.digitalType,
      categoryName: p.category?.name || ''
    })),
    ...categories.map(c => ({
      type: 'category',
      title: c.name,
      slug: c.slug
    }))
  ];

  res.json({ suggestions, products, categories });
});

// @desc    Get all products avec filtres avancés (Cahier des charges 4.4)
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const {
    category,
    search,
    minPrice,
    maxPrice,
    sort,
    page = 1,
    limit = 20,
    productType,
    type,
    digitalType,
    city,
    inStock,
    minRating
  } = req.query;

  let query = {};

  // Filtre par type de produit (Physique / Jumia ou Digital / Chariow)
  const requestedType = (productType || type || '').toUpperCase();
  if (requestedType === 'PHYSICAL' || requestedType === 'DIGITAL') {
    query.productType = requestedType;
  }

  // Filtre par type digital spécifique (Ebook, Formation, Coaching, etc.)
  if (digitalType) {
    query.digitalType = digitalType.toUpperCase();
  }

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
      { description: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } }
    ];
  }

  // Filtre par prix
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  // Filtre par disponibilité
  if (inStock === 'true' || inStock === true) {
    query.$or = [
      { productType: 'DIGITAL' },
      { stock: { $gt: 0 } }
    ];
  }

  // Filtre par vendeur
  if (req.query.vendor) {
    query.vendor = req.query.vendor;
  }

  // Filtre par localisation du vendeur (Ville)
  if (city) {
    const vendorsInCity = await Vendor.find({ city: { $regex: city, $options: 'i' } }).select('_id');
    const vendorIds = vendorsInCity.map(v => v._id);
    query.vendor = { $in: vendorIds };
  }

  // Options de tri
  let sortOption = { createdAt: -1 };
  if (sort === 'price-low') sortOption = { price: 1 };
  else if (sort === 'price-high') sortOption = { price: -1 };
  else if (sort === 'name') sortOption = { name: 1 };
  else if (sort === 'popular') sortOption = { isPopular: -1, visibilityScore: -1 };
  else if (sort === 'newest') sortOption = { createdAt: -1 };

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const products = await Product.find(query)
    .populate('category')
    .populate('vendor', 'shopName slug logo rating isOnline city country')
    .sort(sortOption)
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  // Calculer la note moyenne pour chaque produit
  let productsWithRating = await Promise.all(products.map(async (product) => {
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

  // Filtre par note minimum si spécifié
  if (minRating) {
    const targetRating = parseFloat(minRating);
    productsWithRating = productsWithRating.filter(p => p.rating >= targetRating);
  }

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

  let product = null;

  // Recherche par slug ou par ObjectId
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    product = await Product.findById(id)
      .populate('category')
      .populate('vendor', 'shopName slug logo rating isOnline phone whatsapp description city country banner accentColor')
      .lean();
  }

  if (!product) {
    product = await Product.findOne({ slug: id })
      .populate('category')
      .populate('vendor', 'shopName slug logo rating isOnline phone whatsapp description city country banner accentColor')
      .lean();
  }

  if (!product) {
    res.status(404);
    throw new Error('Produit non trouvé');
  }

  // Calcul de la note
  const reviews = await Review.find({ product: product._id }).populate('user', 'fullName').lean();
  const reviewCount = reviews.length;
  const rating = reviewCount > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0;

  // Produits similaires dans la même catégorie
  const similarProducts = await Product.find({
    category: product.category?._id || product.category,
    _id: { $ne: product._id }
  })
    .limit(4)
    .populate('vendor', 'shopName slug')
    .lean();

  res.json({
    ...product,
    id: product._id,
    rating: Math.round(rating * 10) / 10,
    reviewCount,
    reviews,
    similarProducts
  });
});

// @desc    Create product (avec tous les types du Cahier des charges 4.3)
// @route   POST /api/products
// @access  Private (Admin ou Vendeur)
const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    price,
    oldPrice,
    brand,
    size,
    sku,
    stock,
    categoryId,
    subcategory,
    images,
    videoUrl,
    weight,
    dimensions,
    variants,
    isPopular,
    isAffiliate,
    affiliateUrl,
    productType = 'PHYSICAL',
    digitalType = 'EBOOK',
    digitalFileUrl = '',
    digitalFileName = '',
    digitalFileSize = '',
    digitalAccessLink = '',
    digitalInstructions = '',
    downloadLimit = 0,
    courseModules = [],
    coachingDetails = {},
    externalProduct = {}
  } = req.body;

  if (!name || !description || !price || !categoryId) {
    res.status(400);
    throw new Error('Veuillez remplir tous les champs obligatoires (nom, description, prix, catégorie)');
  }

  const category = await Category.findById(categoryId);
  if (!category) {
    res.status(400);
    throw new Error('Catégorie sélectionnée introuvable');
  }

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
      throw new Error('Votre boutique doit être approuvée par l\'administrateur avant de publier');
    }
    vendorId = vendor._id;
    visibilityScore = vendor.visibilityScore || 0;

    // Vérifier la limite de produits de l'abonnement
    const subscription = await UserSubscription.findOne({ vendor: vendor._id, status: 'ACTIVE' });
    if (subscription && subscription.planSnapshot.maxProducts > 0) {
      const currentCount = await Product.countDocuments({ vendor: vendor._id });
      if (currentCount >= subscription.planSnapshot.maxProducts) {
        res.status(400);
        throw new Error(`Limite de ${subscription.planSnapshot.maxProducts} produits atteinte. Veuillez mettre à niveau votre plan.`);
      }
    }
  }

  // Modération des produits (Cahier des charges 4.3)
  const settings = await Settings.findById('main');
  const requireModeration = settings?.productModeration && req.user.role === 'VENDOR';

  // Slug unique
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;
  while (await Product.findOne({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const isDigital = productType === 'DIGITAL';
  const effectiveStock = isDigital ? 999999 : (parseInt(stock) || 0);

  const product = await Product.create({
    name,
    slug,
    description,
    price: parseFloat(price),
    oldPrice: oldPrice ? parseFloat(oldPrice) : null,
    brand: brand || null,
    size: size || null,
    sku: sku || `SKU-${Date.now().toString().slice(-6)}`,
    stock: effectiveStock,
    category: categoryId,
    subcategory: subcategory || '',
    images: images || [],
    videoUrl: videoUrl || '',
    weight: parseFloat(weight) || 0,
    dimensions: dimensions || { length: 0, width: 0, height: 0 },
    variants: variants || [],
    isPopular: isPopular || false,
    isAffiliate: isAffiliate || false,
    affiliateUrl: affiliateUrl || null,
    productType: isDigital ? 'DIGITAL' : 'PHYSICAL',
    digitalType: digitalType || 'EBOOK',
    digitalFileUrl: digitalFileUrl || '',
    digitalFileName: digitalFileName || '',
    digitalFileSize: digitalFileSize || '',
    digitalAccessLink: digitalAccessLink || '',
    digitalInstructions: digitalInstructions || '',
    downloadLimit: parseInt(downloadLimit) || 0,
    courseModules: courseModules || [],
    coachingDetails: coachingDetails || {},
    externalProduct: externalProduct || {},
    vendor: vendorId,
    visibilityScore,
    moderationStatus: requireModeration ? 'PENDING' : 'APPROVED',
    isApproved: !requireModeration
  });

  const populatedProduct = await Product.findById(product._id).populate('category').populate('vendor', 'shopName slug');
  res.status(201).json({ ...populatedProduct.toObject(), id: populatedProduct._id });
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Admin ou Vendeur propriétaire)
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existingProduct = await Product.findById(id);

  if (!existingProduct) {
    res.status(404);
    throw new Error('Produit non trouvé');
  }

  if (req.user.role === 'VENDOR') {
    const vendor = await Vendor.findOne({ user: req.user._id });
    if (!vendor || !existingProduct.vendor || existingProduct.vendor.toString() !== vendor._id.toString()) {
      res.status(403);
      throw new Error('Vous ne pouvez modifier que vos propres produits');
    }
  }

  const updateData = { ...req.body };
  if (updateData.name && updateData.name !== existingProduct.name) {
    let slug = generateSlug(updateData.name);
    const slugExists = await Product.findOne({ slug, _id: { $ne: id } });
    if (slugExists) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }
    updateData.slug = slug;
  }

  if (updateData.productType === 'DIGITAL') {
    updateData.stock = 999999;
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate('category');

  res.json({ ...updatedProduct.toObject(), id: updatedProduct._id });
});

// @desc    Admin modération de produit (Cahier des charges 4.3)
// @route   PUT /api/products/admin/:id/moderate
// @access  Private/Admin
const moderateProduct = asyncHandler(async (req, res) => {
  const { status, rejectionReason } = req.body;
  if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
    res.status(400);
    throw new Error('Statut de modération invalide');
  }

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    {
      moderationStatus: status,
      isApproved: status === 'APPROVED',
      rejectionReason: rejectionReason || ''
    },
    { new: true }
  );

  if (!product) {
    res.status(404);
    throw new Error('Produit non trouvé');
  }

  res.json({ message: `Produit ${status}`, product });
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

  if (req.user.role === 'VENDOR') {
    const vendor = await Vendor.findOne({ user: req.user._id });
    if (!vendor || !product.vendor || product.vendor.toString() !== vendor._id.toString()) {
      res.status(403);
      throw new Error('Vous ne pouvez supprimer que vos propres produits');
    }
  }

  await Review.deleteMany({ product: id });
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
      let category = await Category.findOne({
        name: { $regex: new RegExp(`^${productData.categoryName}$`, 'i') }
      });

      if (!category) {
        const categorySlug = generateSlug(productData.categoryName || 'sans-categorie');
        category = await Category.create({
          name: productData.categoryName || 'Sans catégorie',
          slug: categorySlug + '-' + Date.now()
        });
      }

      const baseSlug = generateSlug(productData.name);
      let slug = baseSlug;
      let counter = 1;
      while (await Product.findOne({ slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

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
  getSearchSuggestions,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  moderateProduct,
  deleteProduct,
  togglePopular,
  importProducts
};
