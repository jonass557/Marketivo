const express = require('express');
const router = express.Router();
const {
  getBlogs,
  getBlogBySlug,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog
} = require('../controllers/blogController');
const { protect, admin } = require('../middleware/auth');

// Public routes
router.get('/', getBlogs);
router.get('/id/:id', getBlogById);
router.get('/:slug', getBlogBySlug);

// Admin routes
router.post('/', protect, admin, createBlog);
router.put('/:id', protect, admin, updateBlog);
router.delete('/:id', protect, admin, deleteBlog);

module.exports = router;
