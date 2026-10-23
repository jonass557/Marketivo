import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../../config/api';
import { FALLBACK_IMAGE_SVG, safeImage } from '../../data/defaultData';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Loader,
  Star
} from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const Products = () => {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const location = useLocation();

  // Réinitialiser les filtres et recharger lors de la navigation depuis ProductForm
  useEffect(() => {
    if (location.state?.refresh) {
      setSelectedCategory('');
      setSearchQuery('');
      setCurrentPage(1);
    }
  }, [location.state]);

  // Charger les produits et catégories (aussi lors de la navigation)
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [currentPage, selectedCategory, location.key, location.state]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('limit', 10);
      if (selectedCategory && selectedCategory !== 'Tous') {
        params.append('category', selectedCategory);
      }
      
      const { data } = await axios.get(`${API_URL}/api/products?${params}`);
      setProducts(data.products || []);
      setTotalPages(data.pages || 1);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/categories`);
      setCategories(['Tous', ...data.map(cat => cat.name)]);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;
    
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(`${API_URL}/api/products/${id}`, config);
      toast.success('Produit supprimé avec succès');
      fetchProducts();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const togglePopular = async (id) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(`${API_URL}/api/products/${id}/popular`, {}, config);
      toast.success('Statut populaire modifié');
      fetchProducts();
    } catch (error) {
      toast.error('Erreur lors de la modification');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-CM').format(price) + ' XAF';
  };

  const getStatusColor = (status) => {
    return status === 'Actif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProducts(products.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (id) => {
    if (selectedProducts.includes(id)) {
      setSelectedProducts(selectedProducts.filter(p => p !== id));
    } else {
      setSelectedProducts([...selectedProducts, id]);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Export products to CSV
  const handleExport = async () => {
    try {
      setExporting(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${API_URL}/api/products?limit=1000`, config);
      const allProducts = data.products || [];

      if (allProducts.length === 0) {
        toast.error('Aucun produit \u00e0 exporter');
        return;
      }

      // Create CSV content
      const headers = ['Nom', 'Cat\u00e9gorie', 'Prix', 'Ancien Prix', 'Stock', 'Marque', 'Taille', 'Populaire', 'Description'];
      const csvContent = [
        headers.join(';'),
        ...allProducts.map(p => [
          `"${p.name || ''}"`,
          `"${p.category?.name || ''}"`,
          p.price || 0,
          p.oldPrice || '',
          p.stock || 0,
          `"${p.brand || ''}"`,
          `"${p.size || ''}"`,
          p.isPopular ? 'Oui' : 'Non',
          `"${(p.description || '').replace(/"/g, '""').substring(0, 200)}"`
        ].join(';'))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `produits_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`${allProducts.length} produits export\u00e9s avec succ\u00e8s`);
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  // Import products from CSV
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('Fichier CSV vide ou invalide');
        return;
      }

      // Parse CSV (skip header)
      const products = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(';').map(v => v.replace(/^"|"$/g, '').trim());
        if (values.length >= 5) {
          products.push({
            name: values[0],
            categoryName: values[1],
            price: parseFloat(values[2]) || 0,
            oldPrice: values[3] ? parseFloat(values[3]) : null,
            stock: parseInt(values[4]) || 0,
            brand: values[5] || null,
            size: values[6] || null,
            isPopular: values[7]?.toLowerCase() === 'oui',
            description: values[8] || ''
          });
        }
      }

      if (products.length === 0) {
        toast.error('Aucun produit valide trouv\u00e9 dans le fichier');
        return;
      }

      // Send to backend
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post(`${API_URL}/api/products/import`, { products }, config);
      
      toast.success(data.message || `${products.length} produits import\u00e9s`);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'import');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  // Affichage du chargement
  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin text-orange-500" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Produits</h1>
          <p className="text-gray-500">Gérez votre catalogue de produits</p>
        </div>
        <div className="flex gap-2">
          <label className={`flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 cursor-pointer ${importing ? 'opacity-50' : ''}`}>
            <Upload size={18} className={importing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{importing ? 'Import...' : 'Importer'}</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              disabled={importing}
              className="hidden"
            />
          </label>
          <button
            onClick={handleExport}
            disabled={exporting}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 ${exporting ? 'opacity-50' : ''}`}
          >
            <Download size={18} className={exporting ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{exporting ? 'Export...' : 'Exporter'}</span>
          </button>
          <Link
            to="/admin/products/new"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            <Plus size={18} />
            <span>Nouveau produit</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Status filter */}
          <select className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
            <option value="">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="inactive">Rupture</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-orange-800">
            {selectedProducts.length} produit(s) sélectionné(s)
          </span>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50">
              Supprimer
            </button>
            <button className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50">
              Modifier le statut
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-sm text-gray-500">
                <th className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === products.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                </th>
                <th className="px-6 py-4">Produit</th>
                <th className="px-6 py-4">Catégorie</th>
                <th className="px-6 py-4">Prix</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    Aucun produit trouvé
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => handleSelectProduct(product.id)}
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={safeImage(product.images?.[0])}
                          alt={product.name}
                          loading="lazy"
                          onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE_SVG; }}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div>
                          <span className="font-medium">{product.name}</span>
                          {product.isPopular && (
                            <span className="ml-2 text-yellow-500">
                              <Star size={14} className="inline fill-yellow-400" />
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{product.category?.name || '-'}</td>
                    <td className="px-6 py-4 font-medium">{formatPrice(product.price)}</td>
                    <td className="px-6 py-4">
                      <span className={product.stock === 0 ? 'text-red-600 font-medium' : ''}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {product.stock > 0 ? 'En stock' : 'Rupture'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {product.isAffiliate ? (
                          <a
                            href={product.affiliateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-blue-50 rounded text-blue-600"
                            title="Voir sur le site partenaire"
                          >
                            <Eye size={18} />
                          </a>
                        ) : (
                          <Link
                            to={`/product/${product.id}`}
                            target="_blank"
                            className="p-2 hover:bg-gray-100 rounded text-gray-600"
                            title="Voir"
                          >
                            <Eye size={18} />
                          </Link>
                        )}
                        <button
                          onClick={() => togglePopular(product.id)}
                          className={`p-2 rounded ${product.isPopular ? 'text-yellow-500 hover:bg-yellow-50' : 'text-gray-400 hover:bg-gray-100'}`}
                          title={product.isPopular ? 'Retirer des populaires' : 'Marquer comme populaire'}
                        >
                          <Star size={18} className={product.isPopular ? 'fill-yellow-400' : ''} />
                        </button>
                        <Link
                          to={`/admin/products/${product.id}/edit`}
                          className="p-2 hover:bg-blue-50 rounded text-blue-600"
                          title="Modifier"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 hover:bg-red-50 rounded text-red-600"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            Affichage de 1 à {filteredProducts.length} sur {filteredProducts.length} produits
          </p>
          <div className="flex items-center gap-2">
            <button className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>
              <ChevronLeft size={18} />
            </button>
            <button className="px-3 py-1 bg-orange-500 text-white rounded">1</button>
            <button className="px-3 py-1 border rounded hover:bg-gray-50">2</button>
            <button className="px-3 py-1 border rounded hover:bg-gray-50">3</button>
            <button className="p-2 border rounded hover:bg-gray-50">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
