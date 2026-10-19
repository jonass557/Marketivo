const asyncHandler = require('express-async-handler');
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');

// @desc    Get all reviews (admin)
// @route   GET /api/reviews
// @access  Private/Admin
const getReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, productId, rating } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let query = {};
  if (productId) query.product = productId;
  if (rating) query.rating = parseInt(rating);

  const [reviews, total] = await Promise.all([
    Review.find(query)
      .populate('user', 'fullName email')
      .populate('product', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Review.countDocuments(query)
  ]);

  const reviewsWithId = reviews.map(r => ({ ...r, id: r._id }));

  res.json({
    reviews: reviewsWithId,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit))
  });
});

// @desc    Get reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const reviews = await Review.find({ product: productId })
    .populate('user', 'fullName')
    .sort({ createdAt: -1 })
    .lean();

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  res.json({
    reviews: reviews.map(r => ({ ...r, id: r._id })),
    averageRating: Math.round(avgRating * 10) / 10,
    totalReviews: reviews.length
  });
});

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private
const createReview = asyncHandler(async (req, res) => {
  const { productId, orderId, rating, comment } = req.body;
  const userId = req.user._id;

  const product = await Product.findById(productId);

  if (!product) {
    res.status(404);
    throw new Error('Produit non trouvé');
  }

  // Vérifier la commande
  if (orderId) {
    const order = await Order.findOne({
      _id: orderId,
      user: userId,
      'items.product': productId
    });

    if (!order) {
      res.status(400);
      throw new Error('Commande non trouvée ou produit non inclus dans cette commande');
    }
  } else {
    const hasOrdered = await Order.findOne({
      user: userId,
      'items.product': productId
    });

    if (!hasOrdered) {
      res.status(400);
      throw new Error('Vous devez avoir commandé ce produit pour laisser un avis');
    }
  }

  const existingReview = await Review.findOne({ user: userId, product: productId });

  if (existingReview) {
    res.status(400);
    throw new Error('Vous avez déjà donné un avis sur ce produit');
  }

  const review = await Review.create({
    rating: parseInt(rating),
    comment: comment || '',
    user: userId,
    product: productId
  });

  const populatedReview = await Review.findById(review._id)
    .populate('user', 'fullName')
    .populate('product', 'name');

  res.status(201).json({
    message: 'Merci pour votre avis !',
    review: { ...populatedReview.toObject(), id: populatedReview._id }
  });
});

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private/Admin
const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const review = await Review.findById(id)
    .populate('user', 'fullName')
    .populate('product', 'name');

  if (!review) {
    res.status(404);
    throw new Error('Avis non trouvé');
  }

  await Review.findByIdAndDelete(id);

  res.json({
    message: `Avis de ${review.user.fullName} sur "${review.product.name}" supprimé`
  });
});

// @desc    Get review stats
// @route   GET /api/reviews/stats
// @access  Private/Admin
const getReviewStats = asyncHandler(async (req, res) => {
  const total = await Review.countDocuments();
  
  const avgResult = await Review.aggregate([
    { $group: { _id: null, avgRating: { $avg: '$rating' } } }
  ]);
  
  const ratingDistribution = await Review.aggregate([
    { $group: { _id: '$rating', count: { $sum: 1 } } }
  ]);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratingDistribution.forEach(r => {
    distribution[r._id] = r.count;
  });

  res.json({
    total,
    averageRating: Math.round((avgResult[0]?.avgRating || 0) * 10) / 10,
    distribution
  });
});

module.exports = {
  getReviews,
  getProductReviews,
  createReview,
  deleteReview,
  getReviewStats
};
