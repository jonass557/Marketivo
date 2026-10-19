import React, { useState, useContext, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { Star, Heart, ShoppingCart, Truck, Shield, RotateCcw, Minus, Plus, ChevronRight, Share2, MessageCircle, Facebook, Copy, Check, Loader, User, ExternalLink, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import API_URL from '../config/api';
import CartContext from '../context/CartContext';
import AuthContext from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const { formatPrice } = useSettings();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // État pour les avis
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [canReview, setCanReview] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Charger le produit depuis l'API (rafraîchit à chaque navigation)
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${API_URL}/api/products/${id}`);
        setProduct(data);
        setSelectedImage(0);
        setQuantity(1);
      } catch (err) {
        console.error('Erreur:', err);
        setError('Produit non trouvé');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, location.key]);

  // Charger les avis du produit
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setReviewsLoading(true);
        const { data } = await axios.get(`${API_URL}/api/reviews/product/${id}`);
        setReviews(data.reviews || []);
        setAverageRating(data.averageRating || 0);
        setTotalReviews(data.totalReviews || 0);
      } catch (err) {
        console.error('Erreur chargement avis:', err);
      } finally {
        setReviewsLoading(false);
      }
    };
    if (id) fetchReviews();
  }, [id]);

  // Vérifier si l'utilisateur peut laisser un avis
  useEffect(() => {
    const checkCanReview = async () => {
      if (!user || !id) {
        setCanReview(false);
        return;
      }
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.get(`${API_URL}/api/orders/myorders`, config);
        // Vérifier si l'utilisateur a commandé ce produit
        const hasOrdered = data.some(order => 
          order.items?.some(item => item.productId === id || item.product?.id === id)
        );
        // Vérifier si l'utilisateur n'a pas déjà laissé un avis
        const hasReviewed = reviews.some(r => r.user?.id === user.id || r.userId === user.id);
        setCanReview(hasOrdered && !hasReviewed);
      } catch (err) {
        setCanReview(false);
      }
    };
    checkCanReview();
  }, [user, id, reviews]);

  // Soumettre un avis
  const submitReview = async () => {
    if (!user) {
      toast.error('Connectez-vous pour laisser un avis');
      return;
    }
    try {
      setReviewLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(`${API_URL}/api/reviews`, {
        productId: id,
        rating: reviewRating,
        comment: reviewComment
      }, config);
      
      toast.success('Merci pour votre avis !');
      setShowReviewForm(false);
      setReviewRating(5);
      setReviewComment('');
      
      // Recharger les avis
      const { data } = await axios.get(`${API_URL}/api/reviews/product/${id}`);
      setReviews(data.reviews || []);
      setAverageRating(data.averageRating || 0);
      setTotalReviews(data.totalReviews || 0);
      setCanReview(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi');
    } finally {
      setReviewLoading(false);
    }
  };

  // URL du produit pour le partage
  const productUrl = window.location.href;

  // Fonctions de partage
  const shareOnWhatsApp = () => {
    const text = `🛒 Découvrez ce produit incroyable sur MyShop !\n\n*${product.name}*\n💰 Prix: ${formatPrice(product.price)}\n\n👉 ${productUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setShowShareMenu(false);
  };

  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}&quote=${encodeURIComponent(`Découvrez ${product.name} sur MyShop !`)}`, '_blank');
    setShowShareMenu(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(productUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
    toast.success(`${product.name} ajouté au panier !`);
  };

  // Affichage du chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader className="animate-spin text-orange-500" size={48} />
      </div>
    );
  }

  // Affichage de l'erreur
  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Produit non trouvé</h1>
          <p className="text-gray-500 mb-4">Ce produit n'existe pas ou a été supprimé.</p>
          <Link to="/shop" className="text-orange-500 hover:underline">
            Retourner à la boutique
          </Link>
        </div>
      </div>
    );
  }

  // Préparer les images (utiliser un tableau même si une seule image)
  const productImages = product.images?.length > 0 
    ? product.images 
    : ['https://via.placeholder.com/600x600?text=Produit'];

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="container mx-auto px-4">
        {/* Bouton Retour + Fil d'Ariane */}
        <div className="flex items-center gap-4 mb-4 sm:mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-orange-500 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium hidden sm:inline">Retour</span>
          </button>
          <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500 overflow-x-auto scrollbar-hide">
            <Link to="/" className="hover:text-orange-500 whitespace-nowrap">Accueil</Link>
            <ChevronRight size={14} className="flex-shrink-0" />
            <Link to="/shop" className="hover:text-orange-500 whitespace-nowrap">Boutique</Link>
            <ChevronRight size={14} className="flex-shrink-0 hidden sm:block" />
            <Link to={`/shop?category=${product.category?.slug || ''}`} className="hover:text-orange-500 whitespace-nowrap hidden sm:block">{product.category?.name || 'Catégorie'}</Link>
            <ChevronRight size={14} className="flex-shrink-0" />
            <span className="text-gray-800 truncate max-w-[120px] sm:max-w-[200px]">{product.name}</span>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Galerie d'images */}
          <div className="bg-white rounded shadow p-4">
            {/* Image principale */}
            <div className="relative mb-3 sm:mb-4">
              <img
                src={productImages[selectedImage]}
                alt={product.name}
                className="w-full h-64 sm:h-80 lg:h-96 object-contain rounded"
              />
              {product.discount && (
                <span className="absolute top-4 left-4 bg-orange-500 text-white text-sm font-bold px-3 py-1 rounded">
                  -{product.discount}%
                </span>
              )}
              <button className="absolute top-4 right-4 bg-white p-2 rounded-full shadow hover:bg-gray-100">
                <Heart size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Miniatures */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              {productImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`flex-shrink-0 w-14 h-14 sm:w-20 sm:h-20 rounded border-2 overflow-hidden transition-all ${
                    selectedImage === index ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Informations produit */}
          <div className="space-y-4">
            <div className="bg-white rounded shadow p-6">
              {/* Marque */}
              <p className="text-sm text-gray-500 mb-2">{product.brand}</p>

              {/* Nom */}
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">{product.name}</h1>

              {/* Évaluation */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={18}
                      className={i < Math.floor(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-500">
                  {product.rating || 0} ({totalReviews} avis)
                </span>
              </div>

              {/* Prix */}
              <div className="border-t border-b py-3 sm:py-4 mb-3 sm:mb-4">
                <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
                  <span className="text-2xl sm:text-3xl font-bold text-orange-500">
                    {formatPrice(product.price)}
                  </span>
                  {product.oldPrice && (
                    <span className="text-base sm:text-lg text-gray-400 line-through">
                      {formatPrice(product.oldPrice)}
                    </span>
                  )}
                </div>
                {product.discount && (
                  <p className="text-green-600 text-sm mt-1">
                    Vous économisez {formatPrice(product.oldPrice - product.price)}
                  </p>
                )}
              </div>

              {/* Badge Affiliation */}
              {product.isAffiliate && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <ExternalLink size={18} />
                    <span className="font-medium">Produit partenaire</span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    Ce produit est vendu par un partenaire externe. Vous serez redirigé vers leur site pour effectuer l'achat.
                  </p>
                </div>
              )}

              {/* Vendeur */}
              {product.vendor && product.vendor.shopName && (
                <div className="mb-4 p-3 bg-gray-50 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Link to={`/shop/${product.vendor.slug}`} className="flex items-center gap-2 hover:text-blue-600">
                      {product.vendor.logo ? (
                        <img src={product.vendor.logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Shield size={14} className="text-blue-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{product.vendor.shopName}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          {product.vendor.isOnline && <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />}
                          <span>{product.vendor.isOnline ? 'En ligne' : 'Vendeur'}</span>
                          {product.vendor.rating > 0 && (
                            <span className="flex items-center gap-0.5 ml-1">
                              <Star size={10} className="text-yellow-500 fill-yellow-500" />
                              {product.vendor.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-center gap-1.5">
                      {product.vendor.whatsapp && (
                        <a href={`https://wa.me/${product.vendor.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour, je suis intéressé par "${product.name}" sur MyShop.`)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-600">
                          <MessageCircle size={12} /> WhatsApp
                        </a>
                      )}
                      <Link to={user ? `/messages?vendor=${product.vendor.userId || product.vendor.user}` : '/login'}
                        className="flex items-center gap-1 bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-orange-600">
                        <MessageCircle size={12} /> Chat
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Stock - Masqué pour produits affiliés */}
              {!product.isAffiliate && (
                <div className="mb-4">
                  {product.stock > 0 ? (
                    <span className="text-green-600 font-medium">
                      ✓ En stock ({product.stock} disponibles)
                    </span>
                  ) : (
                    <span className="text-red-600 font-medium">
                      ✗ Rupture de stock
                    </span>
                  )}
                </div>
              )}

              {/* Quantité - Masquée pour produits affiliés */}
              {!product.isAffiliate && (
                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <span className="text-sm sm:text-base text-gray-600">Quantité :</span>
                  <div className="flex items-center border rounded">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 sm:p-2.5 hover:bg-gray-100 active:bg-gray-200"
                    >
                      <Minus size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                    <span className="px-3 sm:px-4 py-2 font-medium text-sm sm:text-base">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      className="p-2 sm:p-2.5 hover:bg-gray-100 active:bg-gray-200"
                    >
                      <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                  </div>
                </div>
              )}

              {/* Boutons d'action */}
              <div className="flex gap-2 sm:gap-3">
                {product.isAffiliate ? (
                  <a
                    href={product.affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-2.5 sm:py-3 rounded font-medium flex items-center justify-center gap-2 transition-colors text-sm sm:text-base"
                  >
                    <ExternalLink size={18} className="sm:w-5 sm:h-5" />
                    <span>Acheter sur le site partenaire</span>
                  </a>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white py-2.5 sm:py-3 rounded font-medium flex items-center justify-center gap-2 transition-colors text-sm sm:text-base"
                  >
                    <ShoppingCart size={18} className="sm:w-5 sm:h-5" />
                    <span className="hidden xs:inline">Ajouter au panier</span>
                    <span className="xs:hidden">Ajouter</span>
                  </button>
                )}
                <button className="px-3 sm:px-4 border border-orange-500 text-orange-500 hover:bg-orange-50 active:bg-orange-100 rounded font-medium transition-colors">
                  <Heart size={18} className="sm:w-5 sm:h-5" />
                </button>
                {/* Bouton Partager */}
                <div className="relative">
                  <button 
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="px-4 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded font-medium transition-colors h-full"
                  >
                    <Share2 size={20} />
                  </button>
                  
                  {/* Menu de partage */}
                  {showShareMenu && (
                    <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border z-50 w-56 py-2">
                      <p className="px-4 py-2 text-sm font-semibold text-gray-700 border-b">Partager ce produit</p>
                      
                      <button
                        onClick={shareOnWhatsApp}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 text-left transition-colors"
                      >
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <MessageCircle size={16} className="text-white" />
                        </div>
                        <span className="text-sm font-medium">WhatsApp Status</span>
                      </button>
                      
                      <button
                        onClick={shareOnFacebook}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left transition-colors"
                      >
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <Facebook size={16} className="text-white" />
                        </div>
                        <span className="text-sm font-medium">Facebook</span>
                      </button>
                      
                      <button
                        onClick={copyLink}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors border-t"
                      >
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-600" />}
                        </div>
                        <span className="text-sm font-medium">{copied ? 'Lien copié !' : 'Copier le lien'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Avantages */}
            <div className="bg-white rounded shadow p-3 sm:p-4">
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-3 text-center sm:text-left">
                  <Truck className="text-orange-500 w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-xs sm:text-sm">Livraison rapide</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">Sous 24-48h</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-3 text-center sm:text-left">
                  <Shield className="text-orange-500 w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-xs sm:text-sm">Garantie 1 an</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">Produit authentique</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-3 text-center sm:text-left">
                  <RotateCcw className="text-orange-500 w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-xs sm:text-sm">Retour gratuit</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">Sous 7 jours</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mt-4 sm:mt-6 lg:mt-8 bg-white rounded shadow p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Description du produit</h2>
          <div className="prose max-w-none text-gray-600 whitespace-pre-line text-sm sm:text-base">
            {product.description}
          </div>
        </div>

        {/* Section Avis */}
        <div className="mt-4 sm:mt-6 lg:mt-8 bg-white rounded shadow p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Avis clients</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={18}
                      className={i < Math.floor(averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {averageRating.toFixed(1)} ({totalReviews} avis)
                </span>
              </div>
            </div>
            
            {/* Bouton pour laisser un avis */}
            {canReview && !showReviewForm && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
              >
                <Star size={18} />
                Donner mon avis
              </button>
            )}
          </div>

          {/* Formulaire d'avis */}
          {showReviewForm && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-4">Votre avis sur ce produit</h3>
              
              {/* Étoiles */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Votre note</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        size={28}
                        className={star <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Commentaire */}
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-2">
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Partagez votre expérience avec ce produit..."
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                  rows={3}
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReviewForm(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  onClick={submitReview}
                  disabled={reviewLoading}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {reviewLoading ? (
                    <Loader className="animate-spin" size={18} />
                  ) : (
                    'Envoyer'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Liste des avis */}
          {reviewsLoading ? (
            <div className="flex justify-center py-8">
              <Loader className="animate-spin text-orange-500" size={32} />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle size={48} className="mx-auto mb-3 opacity-50" />
              <p>Aucun avis pour le moment</p>
              {!user && (
                <p className="text-sm mt-2">
                  <Link to="/login" className="text-orange-500 hover:underline">Connectez-vous</Link> et commandez ce produit pour laisser un avis
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review._id || review.id} className="border-b pb-4 last:border-0">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <User size={20} className="text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium">{review.user?.fullName || 'Client'}</span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">
                        {new Date(review.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                      {review.comment && (
                        <p className="text-gray-600 text-sm">{review.comment}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
