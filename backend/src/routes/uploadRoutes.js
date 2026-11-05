const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadImage, uploadFile, deleteImage } = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');

// Configure multer for memory storage (up to 25MB for images/documents)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max
  }
});

router.post('/', protect, upload.single('image'), uploadImage);
router.post('/file', protect, upload.single('file'), uploadFile);
router.delete('/:publicId', protect, deleteImage);

module.exports = router;
