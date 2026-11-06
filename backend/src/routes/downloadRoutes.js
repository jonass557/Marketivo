const express = require('express');
const router = express.Router();
const {
  generateDownloadToken,
  downloadFileWithToken
} = require('../controllers/downloadController');
const { protect } = require('../middleware/auth');

// Génération de token signé (authentifié)
router.get('/token/:orderId/:productId', protect, generateDownloadToken);

// Téléchargement sécurisé via le token (public avec token signé)
router.get('/file/:token', downloadFileWithToken);

module.exports = router;
