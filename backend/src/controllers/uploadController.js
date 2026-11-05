const asyncHandler = require('express-async-handler');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// @desc    Upload image or document to Cloudinary
// @route   POST /api/upload
// @access  Private
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Aucun fichier fourni');
  }

  try {
    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    // Upload to Cloudinary (resource_type: 'auto' handles images, PDFs, archives, etc.)
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'myshop',
      resource_type: 'auto'
    });

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
      name: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Cloudinary error:', error);
    res.status(500);
    throw new Error('Erreur lors de l\'upload du fichier');
  }
});

// @desc    Upload digital product or KYC document
// @route   POST /api/upload/file
// @access  Private
const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Aucun fichier fourni');
  }

  try {
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'myshop/digital',
      resource_type: 'auto',
      use_filename: true
    });

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
      name: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype
    });
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500);
    throw new Error('Erreur lors de l\'upload du fichier digital');
  }
});

// @desc    Delete image from Cloudinary
// @route   DELETE /api/upload/:publicId
// @access  Private
const deleteImage = asyncHandler(async (req, res) => {
  try {
    const result = await cloudinary.uploader.destroy(req.params.publicId);
    res.json({ message: 'Image supprimée', result });
  } catch (error) {
    res.status(500);
    throw new Error('Erreur lors de la suppression de l\'image');
  }
});

module.exports = { uploadImage, uploadFile, deleteImage };
