import React, { useState, useEffect, useContext } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye, Package, AlertCircle } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import AuthContext from '../../context/AuthContext';

const VendorProducts = () => {
  const { user } = useContext(AuthContext);
  const { vendorData } = useOutletContext();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { fetchProducts(); }, [page, search]);

  const fetchProducts = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/products?vendor=${vendorData?._id || ''}&search=${search}&page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setProducts(data.products || []);
      setTotalPages(data.pages || 1);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Supprimer ce produit ?')) return;
    try {
      await axios.delete(`${API_URL}/api/products/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const formatPrice = (p) => new Intl.NumberFormat('fr-CM').format(p) + ' FCFA';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Mes Produits</h2>
          <p className="text-sm text-gray-500">{products.length} produit(s)</p>
        </div>
        <Link to="/vendor/dashboard/products/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700">
          <Plus size={18} /> Ajouter un produit
        </Link>
      </div>

      {/* Limite de produits */}
      {vendorData?.subscription?.planSnapshot?.maxProducts > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2 text-sm">
          <AlertCircle size={16} className="text-blue-600" />
          <span className="text-blue-700">
            {products.length} / {vendorData.subscription.planSnapshot.maxProducts} produits utilisés
          </span>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Rechercher un produit..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <Package size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-600 mb-2">Aucun produit</h3>
          <p className="text-gray-400 text-sm mb-4">Commencez par ajouter votre premier produit</p>
          <Link to="/vendor/dashboard/products/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700">
            <Plus size={16} /> Ajouter un produit
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm text-gray-500">
                <tr>
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3">Prix</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map(product => (
                  <tr key={product._id || product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={product.images?.[0] || '/placeholder.jpg'} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                        <div>
                          <p className="font-medium text-sm text-gray-800 line-clamp-1">{product.name}</p>
                          <p className="text-xs text-gray-400">{product.category?.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{formatPrice(product.price)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        product.isApproved !== false ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {product.isApproved !== false ? 'Actif' : 'En attente'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/product/${product.slug || product._id}`} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Voir">
                          <Eye size={16} className="text-gray-500" />
                        </Link>
                        <Link to={`/vendor/dashboard/products/${product._id || product.id}/edit`} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Modifier">
                          <Edit size={16} className="text-blue-500" />
                        </Link>
                        <button onClick={() => deleteProduct(product._id || product.id)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Supprimer">
                          <Trash2 size={16} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 p-4 border-t">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-sm ${page === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VendorProducts;
