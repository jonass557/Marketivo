import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Filter, Grid, List, ChevronDown, X, Loader, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import API_URL from '../config/api';
import ProductCard from '../components/ProductCard';
import { useSettings } from '../context/SettingsContext';

import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS } from '../data/defaultData';

const Shop = () => {
  const [searchParams] = useSearchParams();
  const { formatPrice } = useSettings();
  
  // Initialisation instantanée (0ms)
  const [products, setProducts] = useState(() => {
    try {
      const cached = localStorage.getItem('marketivo_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_PRODUCTS;
  });

  const [categories, setCategories] = useState(() => {
    try {
      const cached = localStorage.getItem('marketivo_categories');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return ['Tous', ...parsed.map(c => c.name)];
        }
      }
    } catch (e) {}
    return ['Tous', ...DEFAULT_CATEGORIES.map(c => c.name)];
  });

  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('popular');
  const [priceRange, setPriceRange] = useState([0, 2000000]);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

  const location = useLocation();

  // Charger les produits et catégories depuis l'API en tâche de fond (silencieux)
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const results = await Promise.allSettled([
          axios.get(`${API_URL}/api/products`),
          axios.get(`${API_URL}/api/categories`)
        ]);

        if (!isMounted) return;

        if (results[0].status === 'fulfilled') {
          const list = results[0].value?.data?.products || results[0].value?.data;
          if (Array.isArray(list) && list.length > 0) {
            setProducts(list);
            try { localStorage.setItem('marketivo_products', JSON.stringify(list)); } catch (e) {}
          }
        }

        if (results[1].status === 'fulfilled' && Array.isArray(results[1].value?.data) && results[1].value.data.length > 0) {
          setCategories(['Tous', ...results[1].value.data.map(cat => cat.name)]);
          try { localStorage.setItem('marketivo_categories', JSON.stringify(results[1].value.data)); } catch (e) {}
        }
      } catch (error) {
        console.warn('Erreur chargement shop:', error);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [location.key]);

  // Mettre à jour la recherche quand l'URL change
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
    setSelectedCategory(searchParams.get('category') || '');
  }, [searchParams]);

  // Filtrer les produits
  const filteredProducts = products.filter(product => {
    const productCategory = product.category?.name || '';
    const productName = product.name?.toLowerCase() || '';
    const productDescription = product.description?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    
    const matchesSearch = !searchQuery || productName.includes(query) || productDescription.includes(query);
    const matchesCategory = !selectedCategory || selectedCategory === 'Tous' || productCategory === selectedCategory;
    const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
    return matchesSearch && matchesCategory && matchesPrice;
  });

  // Trier les produits
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating;
      default:
        return b.reviews - a.reviews;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, startIndex + productsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery, priceRange, sortBy]);

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-6">
        {/* Bouton Retour */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-orange-500 transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Retour</span>
        </button>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filtres - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded shadow p-4 sticky top-32">
              <h2 className="font-bold text-lg mb-4">Filtres</h2>

              {/* Catégories */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Catégories</h3>
                <ul className="space-y-2">
                  {categories.map((cat) => (
                    <li key={cat}>
                      <button
                        onClick={() => setSelectedCategory(cat === 'Tous' ? '' : cat)}
                        className={`w-full text-left px-3 py-2 rounded transition-colors ${
                          (cat === 'Tous' && !selectedCategory) || selectedCategory === cat
                            ? 'bg-orange-500 text-white'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        {cat}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Prix */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Prix (XAF)</h3>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="2000000"
                    step="10000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                    className="w-full accent-orange-500"
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>0 XAF</span>
                    <span>{formatPrice(priceRange[1])}</span>
                  </div>
                </div>
              </div>

              {/* Reset */}
              <button
                onClick={() => {
                  setSelectedCategory('');
                  setPriceRange([0, 2000000]);
                }}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </aside>

          {/* Contenu principal */}
          <main className="flex-1">
            {/* En-tête */}
            <div className="bg-white rounded shadow p-3 sm:p-4 mb-3 sm:mb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold">
                    {selectedCategory || 'Tous les produits'}
                  </h1>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    {sortedProducts.length} produit{sortedProducts.length > 1 ? 's' : ''} trouvé{sortedProducts.length > 1 ? 's' : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  {/* Bouton filtre mobile */}
                  <button
                    onClick={() => setShowFilters(true)}
                    className="lg:hidden flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 border rounded hover:bg-gray-50 text-sm"
                  >
                    <Filter size={16} />
                    <span>Filtres</span>
                  </button>

                  {/* Tri */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 sm:flex-none px-2 sm:px-4 py-2 border rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base"
                  >
                    <option value="popular">Plus populaires</option>
                    <option value="price-low">Prix croissant</option>
                    <option value="price-high">Prix décroissant</option>
                    <option value="rating">Mieux notés</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Grille de produits */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
              {paginatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} formatPrice={formatPrice} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">
                  Affichage {startIndex + 1}-{Math.min(startIndex + productsPerPage, sortedProducts.length)} sur {sortedProducts.length} produits
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded ${
                          currentPage === pageNum
                            ? 'bg-orange-500 text-white'
                            : 'border hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Message si aucun produit */}
            {sortedProducts.length === 0 && (
              <div className="bg-white rounded shadow p-12 text-center">
                <p className="text-gray-500 text-lg">Aucun produit trouvé</p>
                <button
                  onClick={() => {
                    setSelectedCategory('');
                    setPriceRange([0, 2000000]);
                  }}
                  className="mt-4 text-orange-500 hover:underline"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Modal Filtres Mobile */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[85vw] max-w-80 bg-white p-4 sm:p-6 overflow-y-auto safe-area-inset">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-lg">Filtres</h2>
              <button onClick={() => setShowFilters(false)}>
                <X size={24} />
              </button>
            </div>

            {/* Catégories */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Catégories</h3>
              <ul className="space-y-2">
                {categories.map((cat) => (
                  <li key={cat}>
                    <button
                      onClick={() => {
                        setSelectedCategory(cat === 'Tous' ? '' : cat);
                        setShowFilters(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded transition-colors ${
                        (cat === 'Tous' && !selectedCategory) || selectedCategory === cat
                          ? 'bg-orange-500 text-white'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Prix */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Prix max (XAF)</h3>
              <input
                type="range"
                min="0"
                max="2000000"
                step="10000"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                className="w-full accent-orange-500"
              />
              <p className="text-center mt-2">{formatPrice(priceRange[1])}</p>
            </div>

            {/* Boutons */}
            <div className="space-y-2">
              <button
                onClick={() => setShowFilters(false)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded font-medium"
              >
                Appliquer
              </button>
              <button
                onClick={() => {
                  setSelectedCategory('');
                  setPriceRange([0, 2000000]);
                }}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;
