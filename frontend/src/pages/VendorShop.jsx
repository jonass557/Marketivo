import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Store, Star, MapPin, MessageCircle, Phone, Shield, Clock, Package, Facebook, Instagram, Twitter, Youtube, Linkedin, Globe, Smartphone, Truck, Banknote, CreditCard } from 'lucide-react';
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
        <Link to="/vendors" className="inline-block mt-4 bg-orange-500 text-white px-6 py-2 rounded-xl hover:bg-orange-600">
          Voir toutes les boutiques
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="relative h-40 sm:h-56 bg-gradient-to-r from-blue-600 to-purple-600">
        {vendor.banner && (
          <img src={vendor.banner} alt="" className="w-full h-full object-cover absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Vendor Info */}
      <div className="container mx-auto px-4 -mt-16 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            {/* Logo */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gray-100 border-4 border-white shadow overflow-hidden flex-shrink-0 -mt-12 sm:-mt-16">
              {vendor.logo ? (
                <img src={vendor.logo} alt={vendor.shopName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-blue-600 flex items-center justify-center">
                  <Store size={32} className="text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{vendor.shopName}</h1>
                {vendor.badges?.includes('VERIFIED') && (
                  <Shield size={18} className="text-blue-500" />
                )}
                {vendor.badges?.includes('TOP_SELLER') && (
                  <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">Top Vendeur</span>
                )}
                {/* Online status */}
                <span className={`flex items-center gap-1 text-xs ${vendor.isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${vendor.isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                  {vendor.isOnline ? 'En ligne' : 'Hors ligne'}
                </span>
              </div>

              {vendor.description && (
                <p className="text-gray-600 text-sm mt-2">{vendor.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                {vendor.rating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                    {vendor.rating.toFixed(1)} ({vendor.totalReviews} avis)
                  </span>
                )}
                {vendor.city && (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} /> {vendor.city}, {vendor.country}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Package size={14} /> {vendor.totalSales || 0} ventes
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {vendor.whatsapp && (
                <a href={`https://wa.me/${vendor.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour, je vous contacte depuis votre boutique ${vendor.shopName} sur MyShop.`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-green-600">
                  <MessageCircle size={16} /> WhatsApp
                </a>
              )}
              <Link to={user ? `/messages?vendor=${vendor.userId}` : '/login'}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600">
                <MessageCircle size={16} /> Chat
              </Link>
              {vendor.phone && (
                <a href={`tel:${vendor.phone}`}
                  className="flex items-center justify-center gap-2 border border-gray-300 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Phone size={16} />
                </a>
              )}
            </div>
          </div>

          {/* Social links + Payment methods */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-4 border-t">
            {/* Social links */}
            {vendor.socialLinks && Object.entries(vendor.socialLinks).some(([, v]) => v) && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium mr-1">Suivre :</span>
                {vendor.socialLinks.facebook && <a href={vendor.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"><Facebook size={15} /></a>}
                {vendor.socialLinks.instagram && <a href={vendor.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center bg-pink-50 text-pink-500 rounded-lg hover:bg-pink-100 transition-colors"><Instagram size={15} /></a>}
                {vendor.socialLinks.twitter && <a href={vendor.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"><Twitter size={15} /></a>}
                {vendor.socialLinks.tiktok && <a href={vendor.socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center bg-gray-900 text-white rounded-lg hover:opacity-80 transition-colors text-xs font-bold">TT</a>}
                {vendor.socialLinks.youtube && <a href={vendor.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"><Youtube size={15} /></a>}
                {vendor.socialLinks.linkedin && <a href={vendor.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"><Linkedin size={15} /></a>}
                {vendor.socialLinks.website && <a href={vendor.socialLinks.website} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><Globe size={15} /></a>}
              </div>
            )}

            {/* Accepted payments */}
            {vendor.acceptedPayments && vendor.acceptedPayments.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-gray-400 font-medium mr-1">Paiement :</span>
                {vendor.acceptedPayments.includes('momo_mtn') && <span className="inline-flex items-center gap-1 text-[10px] bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full font-medium border border-yellow-200"><Smartphone size={10} /> MTN MoMo</span>}
                {vendor.acceptedPayments.includes('momo_orange') && <span className="inline-flex items-center gap-1 text-[10px] bg-orange-50 text-orange-700 px-2 py-1 rounded-full font-medium border border-orange-200"><Smartphone size={10} /> Orange Money</span>}
                {vendor.acceptedPayments.includes('cod') && <span className="inline-flex items-center gap-1 text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium border border-green-200"><Truck size={10} /> À la livraison</span>}
                {vendor.acceptedPayments.includes('bank_transfer') && <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium border border-blue-200"><Banknote size={10} /> Virement</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800">Produits ({products.length})</h2>
          <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="bg-white border rounded-lg px-3 py-2 text-sm">
            <option value="">Plus récents</option>
            <option value="price-low">Prix croissant</option>
            <option value="price-high">Prix décroissant</option>
            <option value="popular">Populaires</option>
          </select>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Package size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Cette boutique n'a pas encore de produits</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {products.map(product => (
              <ProductCard key={product._id || product.id} product={product} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i + 1)}
                className={`w-8 h-8 rounded-lg text-sm ${page === i + 1 ? 'bg-orange-500 text-white' : 'bg-white border'}`}>
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
