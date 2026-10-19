import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Store, Star, MapPin, Search, Shield, Package } from 'lucide-react';
import axios from 'axios';
import API_URL from '../config/api';

const VendorsList = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { fetchVendors(); }, [page, search]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/vendors?search=${search}&page=${page}&limit=20`);
      setVendors(data.vendors || []);
      setTotalPages(data.pages || 1);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Nos Boutiques</h1>
        <p className="text-gray-500 mt-2">Découvrez les meilleurs vendeurs de la marketplace</p>
      </div>

      {/* Search */}
      <div className="max-w-lg mx-auto mb-8">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher une boutique..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-11 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-16">
          <Store size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-600 mb-2">Aucune boutique trouvée</h3>
          <p className="text-gray-400 text-sm">Essayez avec un autre terme de recherche</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {vendors.map(vendor => (
            <Link key={vendor._id || vendor.id} to={`/shop/${vendor.slug}`}
              className="bg-white rounded-2xl border hover:shadow-lg transition-all overflow-hidden group">
              {/* Banner */}
              <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-500 relative">
                {vendor.banner && <img src={vendor.banner} alt="" className="w-full h-full object-cover" />}
              </div>
              
              {/* Content */}
              <div className="px-4 pb-4 -mt-8 relative">
                <div className="w-16 h-16 rounded-xl bg-white border-4 border-white shadow overflow-hidden mb-3">
                  {vendor.logo ? (
                    <img src={vendor.logo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-blue-600 flex items-center justify-center">
                      <Store size={24} className="text-white" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-800 group-hover:text-orange-500 transition-colors truncate">
                    {vendor.shopName}
                  </h3>
                  {vendor.badges?.includes('VERIFIED') && <Shield size={14} className="text-blue-500 flex-shrink-0" />}
                </div>

                {vendor.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{vendor.description}</p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-3">
                    {vendor.rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star size={12} className="text-yellow-500 fill-yellow-500" />
                        {vendor.rating.toFixed(1)}
                      </span>
                    )}
                    {vendor.city && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> {vendor.city}
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1">
                    <Package size={12} /> {vendor.totalSales || 0} ventes
                  </span>
                </div>

                {/* Online indicator */}
                <div className="mt-3 pt-3 border-t flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${vendor.isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-xs text-gray-500">{vendor.isOnline ? 'En ligne' : 'Hors ligne'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={`w-8 h-8 rounded-lg text-sm ${page === i + 1 ? 'bg-orange-500 text-white' : 'bg-white border text-gray-600'}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default VendorsList;
