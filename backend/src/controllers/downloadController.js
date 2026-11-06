const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');

const DOWNLOAD_SECRET = process.env.JWT_SECRET || 'marketivo_secure_download_secret_2026';

// Générer un token temporaire et sécurisé pour télécharger un produit digital
exports.generateDownloadToken = async (req, res) => {
  try {
    const { orderId, productId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Commande introuvable' });
    }

    // Vérifier les droits : l'utilisateur propriétaire ou commande invité correspondante
    const isOwner = req.user && order.user && order.user.toString() === req.user._id.toString();
    const isGuestOwner = order.guestCheckout?.isGuest && req.user && order.guestCheckout.email === req.user.email;
    const isAdmin = req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN');

    if (!isOwner && !isGuestOwner && !isAdmin) {
      return res.status(403).json({ message: 'Accès non autorisé à cette commande' });
    }

    // Trouver l'article digital dans la commande
    const item = order.items.find(
      i => (i.product && i.product.toString() === productId) || (i._id && i._id.toString() === productId)
    );

    if (!item) {
      return res.status(404).json({ message: 'Produit digital introuvable dans cette commande' });
    }

    // Récupérer le produit pour vérifier les limites
    const product = await Product.findById(item.product);
    const downloadLimit = item.downloadLimit || product?.downloadLimit || 0;
    const downloadCount = item.downloadCount || 0;

    if (downloadLimit > 0 && downloadCount >= downloadLimit) {
      return res.status(403).json({
        message: `Limite de téléchargements atteinte (${downloadCount}/${downloadLimit} téléchargements utilisés)`
      });
    }

    // Créer un payload sécurisé signé avec expiration 24h
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24h
    const dataToSign = `${order._id}:${item._id}:${expiresAt}`;
    const signature = crypto.createHmac('sha256', DOWNLOAD_SECRET).update(dataToSign).digest('hex');
    const token = Buffer.from(JSON.stringify({
      orderId: order._id,
      itemId: item._id,
      expiresAt,
      signature
    })).toString('base64url');

    // Sauvegarder dans la commande
    item.downloadToken = token;
    item.downloadExpiresAt = new Date(expiresAt);
    await order.save();

    res.json({
      success: true,
      downloadUrl: `/api/downloads/file/${token}`,
      expiresAt: new Date(expiresAt),
      downloadsLeft: downloadLimit > 0 ? (downloadLimit - downloadCount) : 'Illimité',
      fileName: item.digitalFileName || 'produit_digital'
    });
  } catch (error) {
    console.error('Erreur génération token download:', error);
    res.status(500).json({ message: 'Erreur lors de la génération du lien sécurisé' });
  }
};

// Téléchargement sécurisé via le token signé
exports.downloadFileWithToken = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).send('Token manquant');
    }

    let payload;
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      payload = JSON.parse(decoded);
    } catch (e) {
      return res.status(400).send('Lien de téléchargement corrompu ou invalide');
    }

    const { orderId, itemId, expiresAt, signature } = payload;

    // 1. Vérifier la signature HMAC anti-falsification
    const expectedSig = crypto.createHmac('sha256', DOWNLOAD_SECRET)
      .update(`${orderId}:${itemId}:${expiresAt}`)
      .digest('hex');

    if (signature !== expectedSig) {
      return res.status(403).send('Signature de sécurité invalide');
    }

    // 2. Vérifier l'expiration temporelle
    if (Date.now() > expiresAt) {
      return res.status(410).send('Ce lien sécurisé a expiré (durée de validité 24h). Veuillez régénérer un lien depuis votre espace client.');
    }

    // 3. Récupérer la commande et l'article
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).send('Commande introuvable');
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).send('Article introuvable');
    }

    const fileUrl = item.digitalFileUrl;
    if (!fileUrl) {
      return res.status(404).send('Aucun fichier associé à ce produit');
    }

    // 4. Incrémenter le compteur de téléchargements
    item.downloadCount = (item.downloadCount || 0) + 1;
    await order.save();

    // Incrémenter aussi le compteur global du produit
    await Product.findByIdAndUpdate(item.product, { $inc: { downloadCount: 1 } });

    // 5. Rediriger vers le fichier sécurisé ou Cloudinary avec flag attachment
    return res.redirect(fileUrl);
  } catch (error) {
    console.error('Erreur téléchargement sécurisé:', error);
    res.status(500).send('Erreur lors du téléchargement');
  }
};
