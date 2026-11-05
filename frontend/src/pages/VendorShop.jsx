import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Store, Star, MapPin, MessageCircle, Phone, ShieldCheck, Clock,
  Package, Facebook, Instagram, Twitter, Youtube, Linkedin, Globe,
  Smartphone, Truck, Banknote, CreditCard, Share2, Check, Zap, Box
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../config/api';
import AuthContext from '../context/AuthContext';
import ProductCard from '../components/ProductCard';

const VendorShop = () => {
  const { slug } = useParams();
  const { user } = useContext(AuthContext);
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'DIGITAL' | 'PHYSICAL'
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetchShop(); }, [slug, page, sort]);

  const fetchShop = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/vendors/shop/${slug}?page=${page}&limit=20&sort=${sort}`);
      setVendor(data.vendor);
      setProducts(data.products || []);
      setTotalPages(data.pages || 1);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: vendor?.shopName || 'Boutique Marketivo',
          text: vendor?.tagline || vendor?.description || 'Découvrez ma boutique sur Marketivo',
          url
        });
        return;
      } catch (e) {
        // Fallback to clipboard
      }
    }
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-20">
        <Store size={48} className="text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-700">Boutique non trouvée</h2>
        <p className="text-gray-500 mt-2">Cette boutique n'existe pas ou n'est plus active.</p>
        <Link to="/vendors" className="inline-block mt-4 bg-orange-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-orange-600">
          Voir toutes les boutiques
        </Link>
      </div>
    );
  }

  const accentColor = vendor.accentColor || '#f97316';

  // Filter products by type (hybrid Chariow + Jumia)
  const filteredProducts = products.filter(p => {
    if (typeFilter === 'DIGITAL') return p.productType === 'DIGITAL';
    if (typeFilter === 'PHYSICAL') return p.productType !== 'DIGITAL';
    return true;
  });

  const digitalCount = products.filter(p => p.productType === 'DIGITAL').length;
  const physicalCount = products.filter(p => p.productType !== 'DIGITAL').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div
        className="relative h-44 sm:h-64 transition-all"
        style={{
          background: vendor.banner
            ? `url(${vendor.banner}) center/cover no-repeat`
            : `linear-gradient(135deg, ${accentColor}, #1e1b4b)`
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Vendor Info Card */}
      <div className="container mx-auto px-4 -mt-16 sm:-mt-20 relative z-10">
        <div className="bg-white rounded-3xl shadow-xl p-5 sm:p-7 border border-gray-100">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Logo */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border-4 border-white shadow-md overflow-hidden flex-shrink-0 -mt-14 sm:-mt-20">
              {vendor.logo ? (
                <img src={vendor.logo} alt={vendor.shopName} className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  <Store size={36} />
                </div>
              )}
            </div>

            {/* Shop Details */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{vendor.shopName}</h1>

                {vendor.kycStatus === 'VERIFIED' && (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    <ShieldCheck size={14} className="text-emerald-600" /> Vendeur Vérifié
                  </span>
                )}

                {vendor.badges?.includes('TOP_SELLER') && (
                  <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    Top Vendeur
                  </span>
                )}

                {/* Statut En ligne */}
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                  vendor.isOnline ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${vendor.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                  {vendor.isOnline ? 'En ligne' : 'Hors ligne'}
                </span>
              </div>

              {vendor.tagline && (
                <p className="text-sm font-semibold text-gray-700 mt-1 italic">
                  "{vendor.tagline}"
                </p>
              )}

              {vendor.description && (
                <p className="text-gray-600 text-xs sm:text-sm mt-2 line-clamp-3 leading-relaxed">
                  {vendor.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                {vendor.rating > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-gray-800">
                    <Star size={14} className="text-amber-500 fill-amber-500" />
                    {vendor.rating.toFixed(1)} ({vendor.totalReviews} avis)
                  </span>
                )}
                {vendor.city && (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} /> {vendor.city}, {vendor.country}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Package size={14} /> {vendor.totalSales || 0} ventes réalisées
                </span>
              </div>
            </div>

            {/* Actions / Contact & Share */}
            <div className="flex flex-wrap sm:flex-col gap-2 w-full sm:w-auto flex-shrink-0">
              <button
                type="button"
                onClick={handleShare}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"
              >
                {copied ? <Check size={15} className="text-emerald-600" /> : <Share2 size={15} />}
                {copied ? 'Lien copié !' : 'Partager la boutique'}
              </button>

              {vendor.whatsapp && (
                <a
                  href={`https://wa.me/${vendor.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour, je vous contacte depuis votre boutique ${vendor.shopName} sur Marketivo.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <MessageCircle size={15} /> WhatsApp
                </a>
              )}

              <Link
                to={user ? `/messages?vendor=${vendor.userId}` : '/login'}
                style={{ backgroundColor: accentColor }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity shadow-sm"
              >
                <MessageCircle size={15} /> Contacter
              </Link>
            </div>
          </div>

          {/* Social links + Payment methods */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-5 pt-4 border-t border-gray-100">
            {/* Social links */}
            {vendor.socialLinks && Object.entries(vendor.socialLinks).some(([, v]) => v) && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 font-semibold mr-1">Réseaux :</span>
                {vendor.socialLinks.facebook && <a href={vendor.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"><Facebook size={15} /></a>}
                {vendor.socialLinks.instagram && <a href={vendor.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center bg-pink-50 text-pink-500 rounded-lg hover:bg-pink-100 transition-colors"><Instagram size={15} /></a>}
                {vendor.socialLinks.twitter && <a href={vendor.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"><Twitter size={15} /></a>}
                {vendor.socialLinks.tiktok && <a href={vendor.socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center bg-gray-900 text-white rounded-lg hover:opacity-80 transition-colors text-xs font-bold">TT</a>}
                {vendor.socialLinks.youtube && <a href={vendor.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"><Youtube size={15} /></a>}
                {vendor.socialLinks.linkedin && <a href={vendor.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"><Linkedin size={15} /></a>}
                {vendor.socialLinks.website && <a href={vendor.socialLinks.website} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"><Globe size={15} /></a>}
              </div>
            )}

            {/* Accepted payments */}
            {vendor.acceptedPayments && vendor.acceptedPayments.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 font-semibold mr-1">Paiements :</span>
                {vendor.acceptedPayments.includes('momo_mtn') && <span className="inline-flex items-center gap-1 text-[11px] bg-yellow-50 text-yellow-800 px-2 py-0.5 rounded-full font-bold border border-yellow-200"><Smartphone size={10} /> MTN MoMo</span>}
                {vendor.acceptedPayments.includes('momo_orange') && <span className="inline-flex items-center gap-1 text-[11px] bg-orange-50 text-orange-800 px-2 py-0.5 rounded-full font-bold border border-orange-200"><Smartphone size={10} /> Orange Money</span>}
                {vendor.acceptedPayments.includes('cod') && <span className="inline-flex items-center gap-1 text-[11px] bg-green-50 text-green-800 px-2 py-0.5 rounded-full font-bold border border-green-200"><Truck size={10} /> À la livraison</span>}
                {vendor.acceptedPayments.includes('bank_transfer') && <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full font-bold border border-blue-200"><Banknote size={10} /> Virement</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="container mx-auto px-4 py-8">
        {/* Filtres par type de produit (Chariow vs Jumia) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                typeFilter === 'ALL'
                  ? 'bg-gray-900 text-white shadow'
                  : 'bg-white text-gray-700 border hover:bg-gray-50'
              }`}
            >
              Tous les produits ({products.length})
            </button>
            <button
              onClick={() => setTypeFilter('DIGITAL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                typeFilter === 'DIGITAL'
                  ? 'bg-purple-600 text-white shadow'
                  : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
              }`}
            >
              <Zap size={14} /> ⚡ Produits Digitaux ({digitalCount})
            </button>
            <button
              onClick={() => setTypeFilter('PHYSICAL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                typeFilter === 'PHYSICAL'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
              }`}
            >
              <Box size={14} /> 📦 Produits Physiques ({physicalCount})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="bg-white border rounded-xl px-3 py-2 text-xs font-medium text-gray-700 shadow-sm"
            >
              <option value="">Plus récents</option>
              <option value="price-low">Prix croissant</option>
              <option value="price-high">Prix décroissant</option>
              <option value="popular">Plus populaires</option>
            </select>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Package size={44} className="text-gray-300 mx-auto mb-3" />
            <h3 className="font-bold text-gray-700 text-base">Aucun produit dans cette sélection</h3>
            <p className="text-gray-400 text-xs mt-1">Revenez bientôt ou parcourez les autres catégories.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {filteredProducts.map(product => (
              <ProductCard key={product._id || product.id} product={product} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-9 h-9 rounded-xl text-xs font-bold transition-colors ${
                  page === i + 1
                    ? 'text-white shadow'
                    : 'bg-white border text-gray-700 hover:bg-gray-50'
                }`}
                style={page === i + 1 ? { backgroundColor: accentColor } : {}}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorShop;
