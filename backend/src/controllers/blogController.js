const asyncHandler = require('express-async-handler');
const Blog = require('../models/Blog');

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
const getBlogs = asyncHandler(async (req, res) => {
  const { published } = req.query;
  
  let query = {};
  if (published === 'true') {
    query.published = true;
  }

  const blogs = await Blog.find(query).sort({ createdAt: -1 }).lean();
  
  res.json(blogs.map(b => ({ ...b, id: b._id })));
});

// @desc    Get single blog by slug
// @route   GET /api/blogs/:slug
// @access  Public
const getBlogBySlug = asyncHandler(async (req, res) => {
  const blog = await Blog.findOne({ slug: req.params.slug }).lean();

  if (!blog) {
    res.status(404);
    throw new Error('Article non trouvé');
  }

  res.json({ ...blog, id: blog._id });
});

// @desc    Get blog by ID
// @route   GET /api/blogs/id/:id
// @access  Public
const getBlogById = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id).lean();

  if (!blog) {
    res.status(404);
    throw new Error('Article non trouvé');
  }

  res.json({ ...blog, id: blog._id });
});

// @desc    Create a blog
// @route   POST /api/blogs
// @access  Private/Admin
const createBlog = asyncHandler(async (req, res) => {
  const { title, excerpt, content, imageUrl, author, published } = req.body;

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const existingBlog = await Blog.findOne({ slug });
  const finalSlug = existingBlog ? `${slug}-${Date.now()}` : slug;

  const blog = await Blog.create({
    title,
    slug: finalSlug,
    excerpt,
    content,
    imageUrl: imageUrl || null,
    author: author || 'Admin',
    published: published !== undefined ? published : true
  });

  res.status(201).json({ ...blog.toObject(), id: blog._id });
});

// @desc    Update a blog
// @route   PUT /api/blogs/:id
// @access  Private/Admin
const updateBlog = asyncHandler(async (req, res) => {
  const { title, excerpt, content, imageUrl, author, published } = req.body;

  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    res.status(404);
    throw new Error('Article non trouvé');
  }

  let slug = blog.slug;
  if (title && title !== blog.title) {
    slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    const existingBlog = await Blog.findOne({ slug, _id: { $ne: req.params.id } });
    if (existingBlog) {
      slug = `${slug}-${Date.now()}`;
    }
  }

  blog.title = title || blog.title;
  blog.slug = slug;
  blog.excerpt = excerpt || blog.excerpt;
  blog.content = content || blog.content;
  blog.imageUrl = imageUrl !== undefined ? imageUrl : blog.imageUrl;
  blog.author = author || blog.author;
  blog.published = published !== undefined ? published : blog.published;

  await blog.save();

  res.json({ ...blog.toObject(), id: blog._id });
});

// @desc    Delete a blog
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
const deleteBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    res.status(404);
    throw new Error('Article non trouvé');
  }

  await Blog.findByIdAndDelete(req.params.id);

  res.json({ message: 'Article supprimé' });
});

module.exports = {
  getBlogs,
  getBlogBySlug,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog
};
