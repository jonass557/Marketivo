import React, { useState, useContext, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Star, Heart, ShoppingCart, Truck, Shield, RotateCcw, Minus, Plus,
  ChevronRight, Share2, MessageCircle, Facebook, Copy, Check, Loader,
  User, ExternalLink, ArrowLeft, Zap, Download, FileText, Play, Video,
  BookOpen, Calendar, Clock, MapPin, Tag, ChevronDown, ChevronUp, X, Plane, Globe
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../config/api';
import CartContext from '../context/CartContext';
import AuthContext from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { FALLBACK_IMAGE_SVG, safeImage } from '../data/defaultData';

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
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [expandedModule, setExpandedModule] = useState(0);
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

  // Charger le produit depuis l'API
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${API_URL}/api/products/${id}`);
        setProduct(data);
        setSelectedImage(0);
        setQuantity(1);
        if (data.variants && data.variants.length > 0 && data.variants[0].options?.length > 0) {
          setSelectedVariant({ name: data.variants[0].name, option: data.variants[0].options[0] });
        } else {
          setSelectedVariant(null);
        }
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

  // Vérifier si l'utilisateur a acheté ce produit (achat vérifié)
  useEffect(() => {
    const checkCanReview = async () => {
      if (!user || !id) {
        setCanReview(false);
        return;
      }
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.get(`${API_URL}/api/orders/myorders`, config);
        const hasOrdered = data.some(order =>
          order.items?.some(item => (item.productId === id || item.product?._id === id || item.product?.id === id))
        );
        const hasReviewed = reviews.some(r => r.user?._id === user.id || r.user?.id === user.id || r.userId === user.id);
        setCanReview(hasOrdered && !hasReviewed);
      } catch (err) {
        setCanReview(false);
      }
    };
    checkCanReview();
  }, [user, id, reviews]);

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Connectez-vous pour laisser un avis');
      navigate('/login');
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

      toast.success('Merci pour votre avis vérifié !');
      setShowReviewForm(false);
      setReviewComment('');
      // Recharger les avis
      const { data } = await axios.get(`${API_URL}/api/reviews/product/${id}`);
      setReviews(data.reviews || []);
      setAverageRating(data.averageRating || 0);
      setTotalReviews(data.totalReviews || 0);
      setCanReview(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi de l\'avis');
    } finally {
      setReviewLoading(false);
    }
  };

  const productUrl = window.location.href;

  const shareOnWhatsApp = () => {
    const text = `🛒 Découvrez ce produit sur Marketivo !\n\n*${product.name}*\n💰 Prix: ${formatPrice(product.price)}\n\n👉 ${productUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setShowShareMenu(false);
  };

  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`, '_blank');
    setShowShareMenu(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(productUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddToCart = () => {
    const itemToAdd = {
      ...product,
      selectedVariant: selectedVariant || null
    };
    addToCart(itemToAdd, quantity);
    toast.success(`${product.name} ajouté au panier !`);
  };

  const getVideoEmbedUrl = (url) => {
    if (!url) return null;
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}?autoplay=1`;
    }
    return url;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-2xl shadow-sm border max-w-md w-full">
          <h1 className="text-xl font-bold text-gray-800 mb-2">Produit introuvable</h1>
          <p className="text-gray-500 text-xs mb-4">Ce produit n'existe pas ou a été déplacé.</p>
          <Link to="/shop" className="inline-block bg-orange-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors">
            Retourner au catalogue
          </Link>
        </div>
      </div>
    );
  }

  // Galerie jusqu'à 8 photos (Cahier des charges 4.3)
  const productImages = (product.images?.length > 0 ? product.images : [product.image]).filter(Boolean).map(img => safeImage(img));
  if (productImages.length === 0) productImages.push(FALLBACK_IMAGE_SVG);

  const isDigital = product.productType === 'DIGITAL';
  const digitalKind = product.digitalType || 'EBOOK';

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Fil d'Ariane */}
        <div className="flex items-center gap-2 mb-4 text-xs text-gray-500 overflow-x-auto scrollbar-hide">
          <Link to="/" className="hover:text-orange-500 whitespace-nowrap">Accueil</Link>
          <ChevronRight size={13} className="flex-shrink-0" />
          <Link to="/shop" className="hover:text-orange-500 whitespace-nowrap">Boutique</Link>
          {product.category && (
            <>
              <ChevronRight size={13} className="flex-shrink-0" />
              <Link to={`/shop?category=${product.category?.slug || ''}`} className="hover:text-orange-500 whitespace-nowrap">
                {product.category?.name}
              </Link>
            </>
          )}
          <ChevronRight size={13} className="flex-shrink-0" />
          <span className="text-gray-900 font-semibold truncate max-w-[150px]">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          {/* 1. GALERIE D'IMAGES & VIDÉO */}
          <div className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-6 shadow-sm space-y-4 sticky top-24">
            <div className="relative rounded-2xl overflow-hidden bg-gray-50 border flex items-center justify-center h-72 sm:h-96">
              <img
                src={productImages[selectedImage] || FALLBACK_IMAGE_SVG}
                alt={product.name}
                className="max-h-full max-w-full object-contain"
                loading="lazy"
                onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE_SVG; }}
              />

              {/* Badges Type & Remise */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                {isDigital ? (
                  <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow flex items-center gap-1">
                    <Zap size={11} /> ⚡ Produit Digital
                  </span>
                ) : (
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow flex items-center gap-1">
                    📦 Produit Physique
                  </span>
                )}
                {product.oldPrice && product.oldPrice > product.price && (
                  <span className="bg-orange-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow">
                    -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
                  </span>
                )}
              </div>

              {/* Bouton Vidéo si disponible */}
              {product.videoUrl && (
                <button
                  type="button"
                  onClick={() => setShowVideoModal(true)}
                  className="absolute bottom-3 right-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 transition-transform hover:scale-105"
                >
                  <Play size={13} className="fill-white" /> Vidéo démo
                </button>
              )}
            </div>

            {/* Miniatures (jusqu'à 8 photos - Cahier des charges 4.3) */}
            {productImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {productImages.slice(0, 8).map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 overflow-hidden flex-shrink-0 transition-all ${
                      selectedImage === index ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. DÉTAILS DU PRODUIT */}
          <div className="space-y-5">
            <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-7 shadow-sm space-y-4">
              {/* Vendeur / Boutique */}
              {product.vendor && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <Link to={`/shop/${product.vendor.slug}`} className="flex items-center gap-2.5 hover:opacity-80">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center font-bold text-orange-600 text-xs overflow-hidden">
                      {product.vendor.logo ? <img src={product.vendor.logo} alt="" className="w-full h-full object-cover" /> : '🏪'}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-gray-900">{product.vendor.shopName}</p>
                      <p className="text-[11px] text-gray-500">{product.vendor.city || 'Cameroun'} • Vendeur vérifié</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1.5">
                    {product.vendor.whatsapp && (
                      <a
                        href={`https://wa.me/${product.vendor.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour, je souhaite des infos sur ${product.name} sur Marketivo`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-colors"
                        title="Contacter sur WhatsApp"
                      >
                        <MessageCircle size={15} />
                      </a>
                    )}
                    <Link
                      to={user ? `/messages?vendor=${product.vendor.userId || product.vendor.user}` : '/login'}
                      className="text-xs bg-orange-50 text-orange-700 hover:bg-orange-100 font-bold px-3 py-1.5 rounded-xl transition-colors"
                    >
                      Chat
                    </Link>
                  </div>
                </div>
              )}

              {/* Titre & Évaluation */}
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-snug">{product.name}</h1>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star size={14} className="fill-amber-500" />
                    <span className="font-bold text-gray-900">{averageRating.toFixed(1)}</span>
                  </div>
                  <span>•</span>
                  <span>{totalReviews} avis client(s) vérifié(s)</span>
                  {product.sku && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-gray-400">SKU: {product.sku}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Prix */}
              <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-100 flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-extrabold text-orange-600">
                  {formatPrice(product.price)}
                </span>
                {product.oldPrice && (
                  <span className="text-sm sm:text-base text-gray-400 line-through">
                    {formatPrice(product.oldPrice)}
                  </span>
                )}
              </div>

              {/* BANNIÈRE CHARIOW : TYPE DIGITAL & LIVRAISON */}
              {isDigital && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 text-xs text-purple-950 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-purple-900">
                    <Zap size={16} className="text-purple-600" />
                    <span>LIVRAISON AUTOMATIQUE ET IMMÉDIATE (Modèle Chariow)</span>
                  </div>
                  <p className="text-[11px] text-purple-800 leading-relaxed">
                    {digitalKind === 'COURSE' && '🎓 Formation en ligne complète : Accès immédiat aux modules et leçons vidéo/texte/PDF dans votre espace.'}
                    {digitalKind === 'COACHING' && '📅 Service de Coaching / Consultation : Choisissez votre créneau et recevez le lien d\'accès visio (Google Meet/Zoom).'}
                    {digitalKind === 'EXTERNAL' && '🔑 Produit Externe : Accès débloqué par lien sécurisé ou clé de licence aussitôt le paiement validé.'}
                    {(digitalKind === 'EBOOK' || digitalKind === 'TEMPLATE' || digitalKind === 'FILE' || digitalKind === 'SOFTWARE') && '⚡ Téléchargement instantané : Fichier accessible immédiatement 24h/24 après confirmation du paiement.'}
                  </p>
                  {product.digitalFileName && (
                    <div className="inline-flex items-center gap-1.5 bg-white/90 text-purple-800 font-semibold px-2.5 py-1 rounded-lg border border-purple-200 text-[11px]">
                      <Download size={12} /> Fichier inclus : {product.digitalFileName}
                    </div>
                  )}
                </div>
              )}

              {/* BANNIÈRE JUMIA / INTERNATIONALE : TRANSIT CHINE -> AFRIQUE (Section 15 & 16) */}
              {!isDigital && (product.originCountry && product.originCountry !== 'Cameroun' || product.requiresForwarder) && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 text-xs text-blue-950 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-blue-900">
                      <Plane size={16} className="text-blue-600" />
                      <span>ARTICLE INTERNATIONAL (Expédié depuis {product.originCountry || 'la Chine'})</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-200 text-blue-900">
                      {product.customsDeclarationMode || 'DDP Inclus'}
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Acheminement pris en charge par notre réseau de <strong>transitaires partenaires agréés</strong>. Pesée certifiée et photos haute définition prises à l'entrepôt international avant expédition.
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-blue-700">
                      Fret Aérien (7-12 j) • Fret Maritime (35-50 j)
                    </span>
                    <Link
                      to="/forwarders"
                      className="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline"
                    >
                      Voir les transitaires →
                    </Link>
                  </div>
                </div>
              )}

              {/* VARIANTES DU PRODUIT PHYSIQUE (Tailles, Couleurs - Cahier des charges 4.3) */}
              {!isDigital && product.variants && product.variants.length > 0 && (
                <div className="space-y-3 pt-2">
                  {product.variants.map((v, vIdx) => (
                    <div key={vIdx} className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 block">
                        Choisir {v.name} :
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {v.options?.map((opt, oIdx) => {
                          const isSelected = selectedVariant?.name === v.name && selectedVariant?.option === opt;
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => setSelectedVariant({ name: v.name, option: opt })}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                isSelected
                                  ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* QUANTITÉ (Produits Physiques) */}
              {!isDigital && (
                <div className="flex items-center gap-4 pt-1">
                  <span className="text-xs font-bold text-gray-700">Quantité :</span>
                  <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-1.5 hover:bg-gray-200 text-gray-700 font-bold"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="px-4 py-1 text-xs font-bold text-gray-900 bg-white">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-1.5 hover:bg-gray-200 text-gray-700 font-bold"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="text-xs text-emerald-600 font-semibold">
                    ✓ {product.stock > 0 ? `${product.stock} en stock` : 'Disponible'}
                  </span>
                </div>
              )}

              {/* BOUTONS D'ACHAT & ACTIONS */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className={`flex-1 py-3.5 px-6 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] text-white ${
                    isDigital
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-purple-200 hover:from-purple-700 hover:to-indigo-700'
                      : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'
                  }`}
                >
                  {isDigital ? (
                    <>
                      <Download size={18} /> Acheter & Accéder instantanément
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={18} /> Ajouter au panier
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="p-3 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-2xl transition-colors relative"
                  title="Partager ce produit"
                >
                  <Share2 size={18} />
                </button>
              </div>

              {/* Menu Partage */}
              {showShareMenu && (
                <div className="bg-gray-50 border rounded-2xl p-3 flex items-center justify-around gap-2 text-xs">
                  <button onClick={shareOnWhatsApp} className="flex items-center gap-1.5 text-emerald-700 font-bold hover:underline">
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                  <button onClick={shareOnFacebook} className="flex items-center gap-1.5 text-blue-700 font-bold hover:underline">
                    <Facebook size={14} /> Facebook
                  </button>
                  <button onClick={copyLink} className="flex items-center gap-1.5 text-gray-700 font-bold hover:underline">
                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />} {copied ? 'Copié' : 'Copier lien'}
                  </button>
                </div>
              )}
            </div>

            {/* SPÉCIFIQUE FORMATION : MODULES & LEÇONS (Cahier des charges 4.3) */}
            {digitalKind === 'COURSE' && product.courseModules && product.courseModules.length > 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                    <BookOpen size={18} className="text-purple-600" />
                    Programme de la formation ({product.courseModules.length} module(s))
                  </h3>
                  <span className="text-[11px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-full">
                    Accès illimité
                  </span>
                </div>

                <div className="space-y-2.5">
                  {product.courseModules.map((module, mIdx) => (
                    <div key={mIdx} className="border border-gray-200 rounded-2xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedModule(expandedModule === mIdx ? -1 : mIdx)}
                        className="w-full flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left font-bold text-xs text-gray-900"
                      >
                        <span>Module {mIdx + 1} : {module.title}</span>
                        {expandedModule === mIdx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {expandedModule === mIdx && (
                        <div className="p-3 bg-white divide-y divide-gray-100 text-xs">
                          {module.description && <p className="text-[11px] text-gray-500 pb-2">{module.description}</p>}
                          {module.lessons?.map((lesson, lIdx) => (
                            <div key={lIdx} className="py-2 flex items-center justify-between">
                              <span className="flex items-center gap-2 font-medium text-gray-800">
                                {lesson.type === 'VIDEO' ? <Video size={13} className="text-purple-600" /> : <FileText size={13} className="text-blue-600" />}
                                {lesson.title}
                              </span>
                              {lesson.duration && <span className="text-[11px] text-gray-400">{lesson.duration}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SPÉCIFIQUE SERVICE / COACHING (Cahier des charges 4.3) */}
            {digitalKind === 'COACHING' && product.coachingDetails && (
              <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6 shadow-sm space-y-3">
                <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                  <Calendar size={18} className="text-purple-600" />
                  Modalités de la séance
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-purple-50 text-purple-900">
                    <span className="text-gray-500 block text-[10px]">Durée estimée</span>
                    <strong className="text-sm">{product.coachingDetails.durationMinutes || 60} minutes</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-50 text-indigo-900">
                    <span className="text-gray-500 block text-[10px]">Plateforme visio</span>
                    <strong className="text-sm">{product.coachingDetails.meetingPlatform || 'Google Meet'}</strong>
                  </div>
                </div>
                {product.coachingDetails.availabilitySchedule?.length > 0 && (
                  <div className="pt-2 text-xs">
                    <p className="font-bold text-gray-700 mb-1">Jours et créneaux habituels :</p>
                    <div className="flex flex-wrap gap-1.5">
                      {product.coachingDetails.availabilitySchedule.map((s, idx) => (
                        <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg text-[11px]">
                          {s.dayOfWeek}: {s.startTime} - {s.endTime}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Spécifications physiques (Poids, dimensions, SKU, Poids volumétrique) */}
            {!isDigital && (product.weight > 0 || product.dimensions?.length > 0 || product.sku || product.originCountry) && (
              <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm text-xs space-y-2">
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Caractéristiques techniques & Logistique</h4>
                <div className="grid grid-cols-2 gap-2 text-gray-600">
                  {product.sku && <div><span className="text-gray-400">SKU :</span> {product.sku}</div>}
                  {product.weight > 0 && <div><span className="text-gray-400">Poids réel :</span> {product.weight} kg</div>}
                  {product.volumetricWeight > 0 && <div><span className="text-gray-400">Poids volumétrique :</span> {product.volumetricWeight} kg</div>}
                  {product.originCountry && <div><span className="text-gray-400">Origine expédition :</span> {product.originCountry}</div>}
                  {product.dimensions?.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-gray-400">Dimensions :</span> {product.dimensions.length} x {product.dimensions.width} x {product.dimensions.height} cm
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description complète */}
        <div className="mt-8 bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Description complète</h2>
          <div className="prose max-w-none text-gray-700 text-xs sm:text-sm whitespace-pre-line leading-relaxed">
            {product.description}
          </div>
        </div>

        {/* Section Avis Clients */}
        <div className="mt-8 bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Avis des acheteurs vérifiés</h2>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={15} className={i < Math.floor(averageRating) ? 'fill-amber-500' : 'text-gray-200'} />
                  ))}
                </div>
                <span className="font-bold text-gray-900">{averageRating.toFixed(1)} / 5</span>
                <span>({totalReviews} avis vérifiés)</span>
              </div>
            </div>

            {canReview && !showReviewForm && (
              <button
                type="button"
                onClick={() => setShowReviewForm(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow flex items-center gap-1.5"
              >
                <Star size={14} /> Laisser un avis vérifié
              </button>
            )}
          </div>

          {/* Formulaire avis */}
          {showReviewForm && (
            <form onSubmit={submitReview} className="p-4 bg-orange-50/60 rounded-2xl border border-orange-100 space-y-4">
              <h3 className="font-bold text-xs text-gray-900">Partagez votre expérience d'achat</h3>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Votre note sur 5 étoiles</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star size={24} className={star <= reviewRating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Votre commentaire</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Ce que vous avez pensé de ce produit..."
                  className="w-full text-xs p-3 border rounded-xl bg-white focus:ring-2 focus:ring-orange-500"
                  rows={3}
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowReviewForm(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-700 bg-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={reviewLoading}
                  className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 disabled:opacity-50"
                >
                  {reviewLoading ? 'Envoi...' : 'Publier mon avis'}
                </button>
              </div>
            </form>
          )}

          {/* Liste avis */}
          {reviews.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Aucun avis client pour le moment.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {reviews.map((rev, idx) => (
                <div key={idx} className="py-4 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">{rev.user?.fullName || 'Acheteur vérifié'}</span>
                    <span className="text-[11px] text-gray-400">{new Date(rev.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="flex text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} className={i < rev.rating ? 'fill-amber-500' : 'text-gray-200'} />
                    ))}
                  </div>
                  <p className="text-gray-700 leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL VIDÉO DE DÉMONSTRATION */}
      {showVideoModal && product.videoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowVideoModal(false)} />
          <div className="relative bg-black rounded-3xl overflow-hidden w-full max-w-3xl aspect-video shadow-2xl z-10">
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute top-4 right-4 z-20 bg-black/50 text-white p-2 rounded-full hover:bg-black"
            >
              <X size={20} />
            </button>
            <iframe
              src={getVideoEmbedUrl(product.videoUrl)}
              title="Vidéo du produit"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
